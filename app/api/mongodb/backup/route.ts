import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

const execPromise = promisify(exec)

// Directorio para almacenar los respaldos
const BACKUP_DIR = path.join(process.cwd(), "backups")

// Asegurarse de que el directorio de respaldos exista
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// Obtener lista de respaldos disponibles
export async function GET() {
  try {
    // Verificar si el directorio existe
    if (!fs.existsSync(BACKUP_DIR)) {
      return NextResponse.json({ success: true, backups: [] })
    }

    // Leer el directorio de respaldos
    const backupDirs = fs
      .readdirSync(BACKUP_DIR)
      .filter((file) => fs.statSync(path.join(BACKUP_DIR, file)).isDirectory())

    // Obtener información de cada respaldo
    const backups = backupDirs.map((dir) => {
      const backupPath = path.join(BACKUP_DIR, dir)
      const stats = fs.statSync(backupPath)

      // Leer el archivo de metadatos si existe
      let metadata = { database: "unknown", timestamp: stats.mtime.toISOString() }
      const metadataPath = path.join(backupPath, "metadata.json")

      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
        } catch (e) {
          console.error("Error leyendo metadatos:", e)
        }
      }

      // Calcular tamaño total del respaldo
      let totalSize = 0
      const calculateSize = (dirPath: string) => {
        const files = fs.readdirSync(dirPath)
        for (const file of files) {
          const filePath = path.join(dirPath, file)
          const fileStat = fs.statSync(filePath)
          if (fileStat.isDirectory()) {
            calculateSize(filePath)
          } else {
            totalSize += fileStat.size
          }
        }
      }

      calculateSize(backupPath)

      return {
        id: dir,
        database: metadata.database,
        timestamp: metadata.timestamp,
        size: formatSize(totalSize),
        path: backupPath,
      }
    })

    return NextResponse.json({ success: true, backups })
  } catch (error) {
    console.error("Error obteniendo respaldos:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo respaldos" }, { status: 500 })
  }
}

// Crear un respaldo de una base de datos
export async function POST(request: Request) {
  try {
    const { dbName, backupName } = await request.json()

    if (!dbName) {
      return NextResponse.json({ success: false, error: "Nombre de base de datos requerido" }, { status: 400 })
    }

    // Generar un ID único para el respaldo
    const backupId =
      backupName || `respaldo_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}_${uuidv4().substring(0, 8)}`
    const backupPath = path.join(BACKUP_DIR, backupId)

    // Crear directorio para el respaldo
    fs.mkdirSync(backupPath, { recursive: true })

    // Crear un directorio temporal en el contenedor
    const tempDir = `/tmp/backup_${Date.now()}`
    console.log(`Creando directorio temporal en el contenedor: ${tempDir}`)
    await execPromise(`docker exec mongodb mkdir -p ${tempDir}`)

    // Usar una cadena de conexión completa para MongoDB
    const connectionString = `mongodb://Ali:Lourdes1102@localhost:27017/${dbName}?authSource=admin`

    // Ejecutar mongodump con la cadena de conexión
    const command = `docker exec mongodb mongodump --uri="${connectionString}" --out=${tempDir}`

    console.log(`Ejecutando comando de respaldo: ${command.replace(/Lourdes1102/, "****")}`)

    const { stdout, stderr } = await execPromise(command)

    if (stderr && !stderr.includes("done dump")) {
      console.error("Error en mongodump:", stderr)
      throw new Error(stderr)
    }

    console.log("Resultado de mongodump:", stdout || "No output")
    console.log("Mensajes de mongodump:", stderr || "No messages")

    // Verificar que se crearon los archivos de respaldo
    console.log("Verificando archivos de respaldo creados")
    const { stdout: lsOutput } = await execPromise(`docker exec mongodb ls -la ${tempDir}`)
    console.log("Archivos en el directorio temporal:", lsOutput)

    // Copiar los archivos del contenedor al host
    console.log(`Copiando archivos de respaldo del contenedor al host: ${backupPath}`)
    await execPromise(`docker cp mongodb:${tempDir}/. "${backupPath}"`)

    // Verificar que los archivos se copiaron correctamente
    console.log("Verificando archivos copiados")
    const files = fs.readdirSync(backupPath)
    console.log(`Archivos en el directorio de respaldo (${files.length}):`, files)

    if (files.length === 0) {
      throw new Error("No se copiaron archivos de respaldo. Verifica los permisos y la configuración de Docker.")
    }

    // Crear archivo de metadatos
    const metadata = {
      database: dbName,
      timestamp: new Date().toISOString(),
      command: `mongodump --uri="mongodb://[CREDENCIALES_OCULTAS]@localhost:27017/${dbName}?authSource=admin" --out=${tempDir}`,
      format: "mongodump",
    }

    fs.writeFileSync(path.join(backupPath, "metadata.json"), JSON.stringify(metadata, null, 2))

    // Eliminar el directorio temporal en el contenedor
    console.log(`Eliminando directorio temporal: ${tempDir}`)
    await execPromise(`docker exec mongodb rm -rf ${tempDir}`)

    return NextResponse.json({
      success: true,
      message: `Respaldo de ${dbName} creado correctamente`,
      backupId,
      files: files.length,
      details: stdout,
    })
  } catch (error) {
    console.error("Error creando respaldo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error creando respaldo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

// Función para formatear tamaño
function formatSize(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

///ya funciona no mover nada todo esta funcionando aqui. 