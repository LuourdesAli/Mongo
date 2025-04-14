import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import JSZip from "jszip"

// Directorio para almacenar los respaldos
const BACKUP_DIR = path.join(process.cwd(), "backups")

// Función para formatear el tamaño del archivo
function formatSize(bytes: number) {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

// Descargar un respaldo o archivo específico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const backupId = searchParams.get("backupId")
    const filePath = searchParams.get("filePath") || "Z:\Backups"
    const mode = searchParams.get("mode") || "zip" // Modos: zip (default), list, download, info

    if (!backupId) {
      return NextResponse.json({ success: false, error: "ID de respaldo requerido" }, { status: 400 })
    }

    const backupPath = path.join(BACKUP_DIR, backupId)

    // Verificar que el respaldo existe
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ success: false, error: "Respaldo no encontrado" }, { status: 404 })
    }

    // Construir la ruta completa al archivo o directorio solicitado
    const fullPath = filePath ? path.join(backupPath, filePath) : backupPath

    // Verificar que la ruta existe y está dentro del directorio de respaldo
    if (!fs.existsSync(fullPath) || !fullPath.startsWith(backupPath)) {
      return NextResponse.json({ success: false, error: "Ruta no encontrada" }, { status: 404 })
    }

    // Verificar si es un directorio o un archivo
    const stats = fs.statSync(fullPath)
    const isDirectory = stats.isDirectory()

    // MODO ZIP (predeterminado) - crea y descarga un archivo ZIP con todo el contenido
    if (mode === "zip") {
      console.log(`Preparando descarga ZIP para respaldo: ${backupId}`)

      // Crear una instancia de JSZip
      const zip = new JSZip()

      // Función recursiva para agregar archivos al zip
      const addFilesToZip = (dirPath: string, zipFolder: JSZip, basePath = "") => {
        const items = fs.readdirSync(dirPath)
        console.log(`Leyendo directorio ${dirPath}, encontrados ${items.length} elementos`)

        for (const item of items) {
          const fullPath = path.join(dirPath, item)
          const relativePath = path.relative(backupPath, fullPath)
          const zipPath = path.join(basePath, item).replace(/\\/g, "/")
          const itemStats = fs.statSync(fullPath)

          if (itemStats.isDirectory()) {
            // Si es un directorio, llamar recursivamente
            console.log(`Agregando directorio: ${relativePath}`)
            addFilesToZip(fullPath, zip, zipPath)
          } else {
            // Si es un archivo, leerlo y agregarlo al zip
            try {
              console.log(`Agregando archivo: ${relativePath}`)
              const fileData = fs.readFileSync(fullPath)
              zip.file(zipPath, fileData)
            } catch (err) {
              console.error(`Error al leer archivo ${fullPath}:`, err)
            }
          }
        }
      }

      // Agregar archivos al ZIP
      if (isDirectory) {
        addFilesToZip(fullPath, zip)
      } else {
        const fileName = path.basename(fullPath)
        const fileData = fs.readFileSync(fullPath)
        zip.file(fileName, fileData)
      }

      // Generar el archivo ZIP
      console.log("Generando archivo ZIP...")
      const zipBuffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: {
          level: 9,
        },
      })

      console.log(`ZIP generado: ${zipBuffer.length} bytes`)

      if (zipBuffer.length === 0) {
        throw new Error("El archivo ZIP generado está vacío")
      }

      // Devolver el archivo ZIP
      return new NextResponse(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename=${backupId}.zip`,
        },
      })
    }

    // MODO INFO - devuelve metadatos sobre el archivo o directorio
    if (mode === "info") {
      return NextResponse.json({
        success: true,
        path: filePath,
        isDirectory,
        size: formatSize(stats.size),
        modified: stats.mtime,
        created: stats.birthtime,
      })
    }

    // MODO DOWNLOAD - descarga un archivo específico
    if (mode === "download") {
      if (isDirectory) {
        return NextResponse.json(
          { success: false, error: "No se puede descargar un directorio directamente" },
          { status: 400 },
        )
      }

      const fileBuffer = fs.readFileSync(fullPath)
      const fileName = path.basename(fullPath)

      // Determinar el tipo de contenido basado en la extensión del archivo
      let contentType = "application/octet-stream"
      const ext = path.extname(fileName).toLowerCase()

      if (ext === ".json") contentType = "application/json"
      else if (ext === ".txt") contentType = "text/plain"
      else if (ext === ".csv") contentType = "text/csv"
      else if (ext === ".xml") contentType = "application/xml"
      else if (ext === ".bson") contentType = "application/bson"

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename=${fileName}`,
        },
      })
    }

    // MODO LIST - lista archivos en el directorio
    if (mode === "list") {
      if (isDirectory) {
        const items = fs.readdirSync(fullPath)
        const files = items.map((item) => {
          const itemPath = path.join(fullPath, item)
          const itemStats = fs.statSync(itemPath)
          const isItemDir = itemStats.isDirectory()

          return {
            name: item,
            path: filePath ? path.join(filePath, item) : item,
            isDirectory: isItemDir,
            size: formatSize(itemStats.size),
            sizeBytes: itemStats.size,
            modified: itemStats.mtime.toISOString(),
            // Generar URLs para acciones
            downloadUrl: isItemDir
              ? null
              : `/api/mongodb/backup/download?backupId=${backupId}&filePath=${
                  filePath ? path.join(filePath, item) : item
                }&mode=download`,
            browseUrl: isItemDir
              ? `/api/mongodb/backup/download?backupId=${backupId}&filePath=${
                  filePath ? path.join(filePath, item) : item
                }&mode=list`
              : null,
            zipUrl: isItemDir
              ? `/api/mongodb/backup/download?backupId=${backupId}&filePath=${
                  filePath ? path.join(filePath, item) : item
                }&mode=zip`
              : null,
          }
        })

        // Ordenar: directorios primero, luego archivos, ambos alfabéticamente
        files.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })

        // Construir información de navegación
        const pathParts = filePath.split("/").filter(Boolean)
        const breadcrumbs = pathParts.map((part, index) => {
          const pathToHere = pathParts.slice(0, index + 1).join("/")
          return {
            name: part,
            path: pathToHere,
            url: `/api/mongodb/backup/download?backupId=${backupId}&filePath=${pathToHere}&mode=list`,
          }
        })

        return NextResponse.json({
          success: true,
          backupId,
          currentPath: filePath,
          parentPath: pathParts.length > 0 ? pathParts.slice(0, -1).join("/") : null,
          parentUrl:
            pathParts.length > 0
              ? `/api/mongodb/backup/download?backupId=${backupId}&filePath=${pathParts
                  .slice(0, -1)
                  .join("/")}&mode=list`
              : null,
          breadcrumbs,
          files,
          zipUrl: `/api/mongodb/backup/download?backupId=${backupId}&filePath=${filePath}&mode=zip`,
        })
      } else {
        // Si es un archivo y estamos en modo lista, mostrar información del archivo
        return NextResponse.json({
          success: true,
          isFile: true,
          name: path.basename(fullPath),
          size: formatSize(stats.size),
          sizeBytes: stats.size,
          modified: stats.mtime.toISOString(),
          downloadUrl: `/api/mongodb/backup/download?backupId=${backupId}&filePath=${filePath}&mode=download`,
        })
      }
    }

    // Si no se especifica un modo válido, usar ZIP por defecto
    return NextResponse.redirect(
      new URL(`/api/mongodb/backup/download?backupId=${backupId}&filePath=${filePath}&mode=zip`, request.url),
    )
  } catch (error) {
    console.error("Error accediendo al respaldo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error accediendo al respaldo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
///ya funciona no mover nada todo esta funcionando aqui.