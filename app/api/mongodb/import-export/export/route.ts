import { type NextRequest, NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Reemplaza esto con tu cadena de conexión real
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017"

import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const execPromise = promisify(exec)

// Directorio para almacenar archivos temporales
const TEMP_DIR = path.join(process.cwd(), "temp")

// Asegurarse de que el directorio temporal exista
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// Función para obtener el mensaje de error de forma segura
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// Exportar datos de una colección
export async function GET(request: Request) {
  const containerTempFile = ""
  const tempDir = ""

  try {
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get("db")
    const collectionName = searchParams.get("collection")
    const format = searchParams.get("format") || "json"
    const query = searchParams.get("query") || "{}"

    if (!dbName || !collectionName) {
      return NextResponse.json({ success: false, error: "Base de datos y colección requeridas" }, { status: 400 })
    }

    console.log(`Exportando datos de ${dbName}.${collectionName} en formato ${format}`)
    console.log(`Consulta: ${query}`)

    // Generar un nombre de archivo único
    const timestamp = new Date().toISOString().replace(/:/g, "-")
    const fileName = `${dbName}_${collectionName}_${timestamp}_${uuidv4().substring(0, 8)}.${format}`
    const filePath = path.join(TEMP_DIR, fileName)

    // Usar el driver de MongoDB directamente para exportar datos
    console.log("Conectando a MongoDB usando el driver...")

    // Cadena de conexión para el driver
    const connectionString = `mongodb://Ali:Lourdes1102@localhost:27017/${dbName}?authSource=admin`

    const client = new MongoClient(connectionString)
    await client.connect()

    const db = client.db(dbName)
    const coll = db.collection(collectionName)

    // Parsear la consulta si se proporciona
    let queryObj = {}
    try {
      if (query && query !== "{}") {
        queryObj = JSON.parse(query)
      }
    } catch (e) {
      console.error("Error al parsear la consulta:", e)
    }

    // Obtener los documentos
    const documents = await coll.find(queryObj).toArray()
    console.log(`Se encontraron ${documents.length} documentos`)

    let fileContent: Buffer

    if (format === "json") {
      // Para JSON, simplemente convertimos los documentos a JSON
      const jsonContent = JSON.stringify(documents, null, 2)
      fileContent = Buffer.from(jsonContent)

      // Escribir el archivo temporal
      fs.writeFileSync(filePath, fileContent)
      console.log(`Archivo JSON creado: ${filePath} (${fileContent.length} bytes)`)
    } else if (format === "csv") {
      // Para CSV, convertimos los documentos a formato CSV
      const csvContent = convertToCSV(documents)

      // Importante: Agregar BOM (Byte Order Mark) para que Excel reconozca UTF-8
      const bomPrefix = "\uFEFF"
      fileContent = Buffer.from(bomPrefix + csvContent)

      // Escribir el archivo temporal
      fs.writeFileSync(filePath, fileContent)
      console.log(`Archivo CSV creado: ${filePath} (${fileContent.length} bytes)`)
    } else {
      await client.close()
      return NextResponse.json({ success: false, error: "Formato no soportado" }, { status: 400 })
    }

    // Cerrar la conexión
    await client.close()

    // Leer el archivo
    fileContent = fs.readFileSync(filePath)

    // Eliminar el archivo temporal
    fs.unlinkSync(filePath)
    console.log(`Archivo temporal eliminado: ${filePath}`)

    // Determinar el tipo de contenido
    let contentType = "application/octet-stream"
    if (format === "json") {
      contentType = "application/json; charset=utf-8"
    } else if (format === "csv") {
      contentType = "text/csv; charset=utf-8"
    }

    // Devolver el archivo
    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
    })
  } catch (error: unknown) {
    console.error("Error exportando datos:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Error exportando datos",
        details: getErrorMessage(error),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { database, collection, format, query } = await request.json()

    if (!database || !collection) {
      return NextResponse.json({ error: "Se requiere base de datos y colección" }, { status: 400 })
    }

    const client = new MongoClient(MONGODB_URI)
    await client.connect()

    const db = client.db(database)
    const coll = db.collection(collection)

    // Obtener los documentos según la consulta
    const documents = await coll.find(query).toArray()

    if (format === "json") {
      // Para JSON, simplemente devolvemos los documentos
      await client.close()
      return new NextResponse(JSON.stringify(documents, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename=${collection}.json`,
        },
      })
    } else if (format === "csv") {
      // Para CSV, convertimos los documentos a formato CSV
      const csvContent = convertToCSV(documents)
      await client.close()

      // Importante: Agregar BOM (Byte Order Mark) para que Excel reconozca UTF-8
      const bomPrefix = "\uFEFF"

      return new NextResponse(bomPrefix + csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename=${collection}.csv`,
        },
      })
    }

    await client.close()
    return NextResponse.json({ error: "Formato no soportado" }, { status: 400 })
  } catch (error: unknown) {
    console.error("Error:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

function convertToCSV(documents: any[]) {
  if (documents.length === 0) {
    return ""
  }

  // Obtener todas las claves únicas de todos los documentos
  const allKeys = new Set<string>()
  documents.forEach((doc) => {
    Object.keys(doc).forEach((key) => allKeys.add(key))
  })

  const headers = Array.from(allKeys)

  // Crear la línea de encabezado
  let csv = headers.map((key) => `"${escapeCSV(key)}"`).join(",") + "\n"

  // Agregar filas de datos
  documents.forEach((doc) => {
    const row = headers.map((key) => {
      const value = doc[key]
      if (value === undefined || value === null) {
        return '""'
      }
      if (typeof value === "object") {
        return `"${escapeCSV(JSON.stringify(value))}"`
      }
      return `"${escapeCSV(String(value))}"`
    })
    csv += row.join(",") + "\n"
  })

  return csv
}

// Escapar caracteres especiales en CSV
function escapeCSV(str: string) {
  return str.replace(/"/g, '""')
}
///ya funciona no mover nada todo esta funcionando aqui. 