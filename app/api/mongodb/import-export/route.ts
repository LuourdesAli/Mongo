import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execPromise = promisify(exec)

// Directorio para almacenar archivos temporales
const TEMP_DIR = path.join(process.cwd(), "temp")

// Asegurarse de que el directorio temporal exista
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// Exportar datos de una colección
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const dbName = searchParams.get("db")
  const collectionName = searchParams.get("collection")
  const format = searchParams.get("format") || "json"
  const query = searchParams.get("query") || "{}"

  if (!dbName || !collectionName) {
    return NextResponse.json({ success: false, error: "Base de datos y colección requeridas" }, { status: 400 })
  }

  try {
    const timestamp = new Date().toISOString().replace(/:/g, "-")
    const fileName = `${dbName}_${collectionName}_${timestamp}.${format}`
    const filePath = path.join(TEMP_DIR, fileName)

    let command

    if (format === "json") {
      command = `docker exec mongodb mongoexport --db=${dbName} --collection=${collectionName} --out=${filePath} --query='${query}' --username=Lulu --password=Lourdes1102`
    } else if (format === "csv") {
      command = `docker exec mongodb mongoexport --db=${dbName} --collection=${collectionName} --out=${filePath} --type=csv --fields=_id,name,value --query='${query}' --username=Lulu --password=Lourdes1102`
    } else {
      return NextResponse.json({ success: false, error: "Formato no soportado" }, { status: 400 })
    }

    await execPromise(command)

    // Leer el archivo y devolverlo como respuesta
    const fileContent = fs.readFileSync(filePath, "utf-8")

    // Eliminar el archivo temporal
    fs.unlinkSync(filePath)

    return new NextResponse(fileContent, {
      headers: {
        "Content-Type": format === "json" ? "application/json" : "text/csv",
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
    })
  } catch (error) {
    console.error("Error exportando datos:", error)
    return NextResponse.json({ success: false, error: "Error exportando datos" }, { status: 500 })
  }
}

// Importar datos a una colección
export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File
  const dbName = formData.get("db") as string
  const collectionName = formData.get("collection") as string
  const dropCollection = formData.get("drop") === "true"

  if (!file || !dbName || !collectionName) {
    return NextResponse.json(
      { success: false, error: "Archivo, base de datos y colección requeridos" },
      { status: 400 },
    )
  }

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name
    const filePath = path.join(TEMP_DIR, fileName)

    // Guardar el archivo temporalmente
    fs.writeFileSync(filePath, fileBuffer)

    let command

    if (fileName.endsWith(".json")) {
      command = `docker exec mongodb mongoimport --db=${dbName} --collection=${collectionName} ${dropCollection ? "--drop" : ""} --file=${filePath} --username=admin --password=password`
    } else if (fileName.endsWith(".csv")) {
      command = `docker exec mongodb mongoimport --db=${dbName} --collection=${collectionName} ${dropCollection ? "--drop" : ""} --type=csv --headerline --file=${filePath} --username=admin --password=password`
    } else {
      return NextResponse.json({ success: false, error: "Formato de archivo no soportado" }, { status: 400 })
    }

    await execPromise(command)

    // Eliminar el archivo temporal
    fs.unlinkSync(filePath)

    return NextResponse.json({
      success: true,
      message: `Datos importados correctamente a ${dbName}.${collectionName}`,
    })
  } catch (error) {
    console.error("Error importando datos:", error)
    return NextResponse.json({ success: false, error: "Error importando datos" }, { status: 500 })
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 