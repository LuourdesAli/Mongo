import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import { v4 as uuidv4 } from "uuid"
import extract from "extract-zip"

const execPromise = promisify(exec)

// Directorio para almacenar los respaldos
const BACKUP_DIR = path.join(process.cwd(), "backups")
const TEMP_DIR = path.join(process.cwd(), "temp")

// Asegurarse de que los directorios existan
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

// Subir y restaurar un respaldo
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const dbName = formData.get("dbName") as string

    if (!file || !dbName) {
      return NextResponse.json(
        { success: false, error: "Archivo y nombre de base de datos requeridos" },
        { status: 400 },
      )
    }

    // Generar un ID único para el respaldo
    const backupId = `${dbName}_${new Date().toISOString().replace(/:/g, "-")}_${uuidv4().substring(0, 8)}`
    const backupPath = path.join(BACKUP_DIR, backupId)

    // Crear directorio para el respaldo
    fs.mkdirSync(backupPath, { recursive: true })

    // Guardar el archivo
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const filePath = path.join(TEMP_DIR, file.name)
    fs.writeFileSync(filePath, fileBuffer)

    // Si es un archivo zip, extraerlo
    if (file.name.endsWith(".zip")) {
      await extract(filePath, { dir: backupPath })
    } else {
      // Copiar el archivo al directorio de respaldo
      fs.copyFileSync(filePath, path.join(backupPath, file.name))
    }

    // Eliminar el archivo temporal
    fs.unlinkSync(filePath)

    // Crear archivo de metadatos
    const metadata = {
      database: dbName,
      timestamp: new Date().toISOString(),
      originalFile: file.name,
    }

    fs.writeFileSync(path.join(backupPath, "metadata.json"), JSON.stringify(metadata, null, 2))

    // Ejecutar mongorestore para restaurar el respaldo
    // Corregido: Añadido --authenticationDatabase=admin para especificar dónde buscar las credenciales
    const command = `docker exec mongodb mongorestore --db=${dbName} --drop /backups/${backupId} --username=Lulu --password=Lourdes1102 --authenticationDatabase=admin`

    console.log(`Ejecutando comando de restauración: ${command.replace(/Lourdes1102/, "********")}`)

    const { stdout, stderr } = await execPromise(command)
    console.log("Resultado de mongorestore:", stdout || "No output")
    console.log("Mensajes de mongorestore:", stderr || "No messages")

    return NextResponse.json({
      success: true,
      message: `Respaldo restaurado en ${dbName} correctamente`,
      backupId,
    })
  } catch (error) {
    console.error("Error subiendo y restaurando respaldo:", error)

    // Mejorado: Devolver más detalles sobre el error
    let errorMessage = "Error subiendo y restaurando respaldo"
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 })
  }
}
///ya funciona no mover nada todo esta funcionando aqui. 