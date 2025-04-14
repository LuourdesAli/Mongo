import { NextResponse } from "next/server"
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

// Importar datos a una colección
export async function POST(request: Request) {
  let containerTempFile = ""
  let localTempFile = ""
  let processedTempFile = ""

  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const dbName = formData.get("db") as string
    const collectionName = formData.get("collection") as string
    const drop = formData.get("drop") === "true"
    const processJson = formData.get("processJson") !== "false" // Por defecto, procesar JSON

    if (!file || !dbName || !collectionName) {
      return NextResponse.json(
        { success: false, error: "Archivo, base de datos y colección requeridos" },
        { status: 400 },
      )
    }

    console.log(`Importando datos a ${dbName}.${collectionName}`)
    console.log(`Archivo: ${file.name}, Tamaño: ${file.size} bytes`)
    console.log(`Eliminar colección existente: ${drop}`)
    console.log(`Procesar JSON: ${processJson}`)

    // Determinar el formato del archivo
    const fileExt = path.extname(file.name).toLowerCase()
    const isJson = fileExt === ".json"
    const isCsv = fileExt === ".csv"

    if (!isJson && !isCsv) {
      return NextResponse.json(
        { success: false, error: "Formato de archivo no soportado. Use JSON o CSV." },
        { status: 400 },
      )
    }

    // Generar un nombre de archivo único
    const timestamp = Date.now()
    const tempFileName = `import_${timestamp}_${uuidv4().substring(0, 8)}${fileExt}`
    localTempFile = path.join(TEMP_DIR, tempFileName)
    containerTempFile = `/tmp/${tempFileName}`

    // Guardar el archivo en el sistema de archivos local
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(localTempFile, buffer)
    console.log(`Archivo guardado localmente: ${localTempFile}`)

    // Para archivos JSON, verificar si es un array o un objeto único
    let isJsonArray = false
    if (isJson) {
      try {
        const fileContent = fs.readFileSync(localTempFile, "utf8")
        // Verificar si el contenido comienza con '[' (array JSON)
        const trimmedContent = fileContent.trim()
        isJsonArray = trimmedContent.startsWith("[")
        console.log(`Formato JSON detectado: ${isJsonArray ? "Array JSON" : "Objeto JSON único"}`)

        // Si es un objeto JSON único y se solicita procesamiento, transformarlo
        if (!isJsonArray && processJson) {
          console.log("Procesando objeto JSON para estructurarlo...")
          const jsonData = JSON.parse(fileContent)

          // Transformar el JSON en una estructura más plana
          const processedData = processJsonMetadata(jsonData)

          // Guardar el JSON procesado en un nuevo archivo
          const processedFileName = `processed_${tempFileName}`
          processedTempFile = path.join(TEMP_DIR, processedFileName)

          // Si es un solo objeto, convertirlo en array para importarlo
          const dataToSave = Array.isArray(processedData) ? processedData : [processedData]

          fs.writeFileSync(processedTempFile, JSON.stringify(dataToSave))
          console.log(`JSON procesado guardado en: ${processedTempFile}`)

          // Actualizar la ruta del archivo local para usar el procesado
          localTempFile = processedTempFile
          containerTempFile = `/tmp/${processedFileName}`

          // Ahora es un array JSON
          isJsonArray = true
        }
      } catch (err) {
        console.error("Error al procesar el archivo JSON:", err)
      }
    }

    // Copiar el archivo al contenedor
    console.log(`Copiando archivo al contenedor: ${containerTempFile}`)
    await execPromise(`docker cp "${localTempFile}" "mongodb:${containerTempFile}"`)

    // Usar la cadena de conexión que funciona para los respaldos
    const connectionString = `mongodb://Lulu:Lourdes1102@localhost:27017/${dbName}?authSource=admin`

    // Comando para importar los datos
    let command = ""

    if (isJson) {
      // Importar JSON usando mongoimport
      // Solo usar --jsonArray si realmente es un array JSON o si procesamos el JSON
      command = `docker exec mongodb mongoimport --uri="${connectionString}" --collection=${collectionName} --file=${containerTempFile} ${isJsonArray ? "--jsonArray" : ""} ${
        drop ? "--drop" : ""
      }`
    } else if (isCsv) {
      // Importar CSV usando mongoimport
      command = `docker exec mongodb mongoimport --uri="${connectionString}" --collection=${collectionName} --file=${containerTempFile} --type=csv --headerline ${
        drop ? "--drop" : ""
      }`
    }

    console.log(`Ejecutando comando de importación: ${command.replace(/Lulu:Lourdes1102/, "USERNAME:PASSWORD")}`)

    // Ejecutar el comando de importación
    const { stdout, stderr } = await execPromise(command)
    console.log("Resultado de importación:", stdout || "No output")
    console.log("Mensajes de importación:", stderr || "No messages")

    // Verificar si hubo errores
    if (stderr && stderr.includes("Failed") && !stderr.includes("imported successfully")) {
      throw new Error(`Error en importación: ${stderr}`)
    }

    // Extraer información de la importación
    let documentsImported = 0
    let documentsModified = 0

    // Extraer información de mongoimport
    const importedMatch = stderr.match(/(\d+) document$$s$$ imported successfully/)
    if (importedMatch && importedMatch[1]) {
      documentsImported = Number.parseInt(importedMatch[1], 10)
    }

    const modifiedMatch = stderr.match(/(\d+) document$$s$$ modified/)
    if (modifiedMatch && modifiedMatch[1]) {
      documentsModified = Number.parseInt(modifiedMatch[1], 10)
    }

    // Limpiar archivos temporales
    console.log("Limpiando archivos temporales...")
    if (fs.existsSync(localTempFile)) {
      fs.unlinkSync(localTempFile)
    }
    if (processedTempFile && fs.existsSync(processedTempFile) && processedTempFile !== localTempFile) {
      fs.unlinkSync(processedTempFile)
    }
    await execPromise(`docker exec mongodb rm -f ${containerTempFile}`)

    return NextResponse.json({
      success: true,
      message: `Datos importados correctamente a ${dbName}.${collectionName}`,
      documentsImported,
      documentsModified,
    })
  } catch (error) {
    console.error("Error importando datos:", error)

    // Limpiar archivos temporales
    try {
      if (localTempFile && fs.existsSync(localTempFile)) {
        fs.unlinkSync(localTempFile)
        console.log(`Archivo temporal local eliminado: ${localTempFile}`)
      }
      if (processedTempFile && fs.existsSync(processedTempFile) && processedTempFile !== localTempFile) {
        fs.unlinkSync(processedTempFile)
        console.log(`Archivo temporal procesado eliminado: ${processedTempFile}`)
      }
      if (containerTempFile) {
        await execPromise(`docker exec mongodb rm -f ${containerTempFile}`)
        console.log(`Archivo temporal eliminado del contenedor: ${containerTempFile}`)
      }
    } catch (cleanupError) {
      console.error("Error eliminando archivos temporales:", cleanupError)
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error importando datos",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Función para procesar y estructurar el JSON de metadatos
function processJsonMetadata(jsonData: any): any[] {
  // Si ya es un array, devolverlo como está
  if (Array.isArray(jsonData)) {
    return jsonData
  }

  const result = []

  // Extraer información básica del dataset
  const basicInfo = {
    type: jsonData["@type"] || "Dataset",
    name: jsonData.name || "Unknown",
    description: jsonData.description ? jsonData.description.substring(0, 200) + "..." : "No description",
    license: jsonData.license?.name || "Unknown",
    creator: jsonData.creator?.name || "Unknown",
    datePublished: jsonData.datePublished || "Unknown",
    url: jsonData.url || "Unknown",
  }

  result.push({
    ...basicInfo,
    documentType: "dataset_info",
  })

  // Extraer información de distribución (archivos)
  if (jsonData.distribution && Array.isArray(jsonData.distribution)) {
    jsonData.distribution.forEach((dist: any, index: number) => {
      result.push({
        name: dist.name || `File ${index + 1}`,
        contentUrl: dist.contentUrl || "Unknown",
        contentSize: dist.contentSize || "Unknown",
        encodingFormat: dist.encodingFormat || "Unknown",
        description: dist.description || "No description",
        documentType: "distribution",
      })
    })
  }

  // Extraer información de campos (si existe)
  if (jsonData.recordSet && Array.isArray(jsonData.recordSet)) {
    jsonData.recordSet.forEach((recordSet: any) => {
      if (recordSet.field && Array.isArray(recordSet.field)) {
        recordSet.field.forEach((field: any) => {
          result.push({
            name: field.name || "Unknown field",
            description: field.description || "No description",
            dataType: Array.isArray(field.dataType) ? field.dataType.join(", ") : field.dataType || "Unknown",
            source: field.source?.fileObject?.["@id"] || "Unknown",
            column: field.source?.extract?.column || "Unknown",
            documentType: "field",
          })
        })
      }
    })
  }

  // Si no se pudo extraer información estructurada, devolver el objeto original
  if (result.length === 0) {
    result.push({
      ...jsonData,
      documentType: "raw_json",
    })
  }

  return result
}
///ya funciona no mover nada todo esta funcionando aqui. 