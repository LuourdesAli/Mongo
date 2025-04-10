import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"

const execPromise = promisify(exec)

// Directorio para almacenar los respaldos
const BACKUP_DIR = path.join(process.cwd(), "backups")

// Restaurar un respaldo
export async function POST(request: Request) {
  try {
    const { backupId, dbName, collectionName } = await request.json()

    if (!backupId) {
      return NextResponse.json({ success: false, error: "ID de respaldo requerido" }, { status: 400 })
    }

    console.log("Iniciando restauración de base de datos")
    console.log("backupId recibido:", backupId)

    const backupPath = path.join(BACKUP_DIR, backupId)
    console.log("Ruta del respaldo:", backupPath)

    // Verificar que el respaldo existe
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json({ success: false, error: "Respaldo no encontrado" }, { status: 404 })
    }

    // Leer metadatos si existen
    let targetDbName = dbName
    let targetCollectionName = collectionName
    const metadataPath = path.join(backupPath, "metadata.json")

    if (fs.existsSync(metadataPath)) {
      console.log("Buscando metadatos en:", metadataPath)
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, "utf-8"))
        // Usar el nombre de la base de datos de los metadatos si no se especificó uno
        if (!targetDbName && metadata.database) {
          targetDbName = metadata.database
          console.log("Metadatos leídos correctamente. Nombre de base de datos:", targetDbName)
        }

        // Si hay información de colección en los metadatos, usarla
        if (!targetCollectionName && metadata.collection) {
          targetCollectionName = metadata.collection
          console.log("Nombre de colección:", targetCollectionName)
        }
      } catch (e) {
        console.error("Error leyendo metadatos:", e)
      }
    }

    if (!targetDbName) {
      return NextResponse.json({ success: false, error: "Nombre de base de datos requerido" }, { status: 400 })
    }

    // Verificar conexión a MongoDB
    console.log("Verificando conexión a MongoDB...")
    const pingCommand = `docker exec mongodb mongosh --username Ali --password Lourdes1102 --authenticationDatabase admin --eval "db.runCommand({ping:1})"`
    console.log("Comando de ping:", pingCommand.replace(/password \w+/, "password ****"))

    try {
      await execPromise(pingCommand)
      console.log("Conexión a MongoDB exitosa")
    } catch (error) {
      console.error("Error conectando a MongoDB:", error)
      return NextResponse.json({ success: false, error: "Error conectando a MongoDB" }, { status: 500 })
    }

    // Crear un directorio temporal en el contenedor
    const tempDir = `/tmp/backup_${Date.now()}`
    console.log(`Creando directorio temporal en el contenedor: docker exec mongodb mkdir -p ${tempDir}`)
    await execPromise(`docker exec mongodb mkdir -p ${tempDir}`)

    // Copiar los archivos de respaldo al contenedor
    console.log(`Copiando archivos de respaldo al contenedor: docker cp "${backupPath}/." mongodb:${tempDir}/`)
    await execPromise(`docker cp "${backupPath}/." mongodb:${tempDir}/`)

    // Verificar que los archivos se copiaron correctamente
    console.log(`Verificando archivos copiados: docker exec mongodb ls -la ${tempDir}`)
    const { stdout: lsOutput } = await execPromise(`docker exec mongodb ls -la ${tempDir}`)
    console.log("Contenido del directorio en el contenedor:", lsOutput)

    // Buscar archivos en el directorio temporal
    let filesImported = 0
    const importResults = []

    // Primero intentar con archivos BSON (formato nativo de MongoDB)
    console.log(`Buscando archivos BSON: docker exec mongodb find ${tempDir} -name "*.bson"`)
    const { stdout: bsonFiles } = await execPromise(`docker exec mongodb find ${tempDir} -name "*.bson"`)
    const bsonFilesList = bsonFiles.trim().split("\n").filter(Boolean)
    console.log("Archivos BSON encontrados:", bsonFilesList)

    if (bsonFilesList.length > 0) {
      // Si encontramos archivos BSON, usar mongorestore
      for (const bsonFile of bsonFilesList) {
        const bsonDir = path.dirname(bsonFile)
        const collectionName = path.basename(bsonFile, ".bson")

        console.log(`Restaurando archivo BSON ${bsonFile} a la base de datos ${targetDbName}`)
        const restoreCommand = `docker exec mongodb mongorestore --username Ali --password Lourdes1102 --authenticationDatabase admin --db=${targetDbName} --collection=${collectionName} ${bsonFile} --drop`
        console.log("Comando de restauración:", restoreCommand.replace(/password \w+/, "password ****"))

        try {
          const { stdout, stderr } = await execPromise(restoreCommand)
          console.log("Resultado de la restauración:", stdout)
          console.log("Mensajes durante la restauración:", stderr)
          filesImported++
          importResults.push({
            file: bsonFile,
            collection: collectionName,
            success: true,
          })
        } catch (error) {
          console.error(`Error restaurando archivo ${bsonFile}:`, error)
          importResults.push({
            file: bsonFile,
            collection: collectionName,
            success: false,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }
    } else {
      // Si no hay archivos BSON, buscar archivos JSON
      console.log(
        `Buscando archivos JSON: docker exec mongodb find ${tempDir} -name "*.json" -not -name "metadata.json"`,
      )
      const { stdout: jsonFiles } = await execPromise(
        `docker exec mongodb find ${tempDir} -name "*.json" -not -name "metadata.json"`,
      )
      const jsonFilesList = jsonFiles.trim().split("\n").filter(Boolean)
      console.log("Archivos JSON encontrados:", jsonFilesList)

      if (jsonFilesList.length > 0) {
        // Importar cada archivo JSON encontrado
        for (const jsonFile of jsonFilesList) {
          // Determinar el nombre de la colección basado en el nombre del archivo
          const fileName = path.basename(jsonFile, ".json")
          const collection = targetCollectionName || fileName

          console.log(
            `Importando archivo ${jsonFile} a la colección ${collection}: docker exec mongodb mongoimport --username Ali --password **** --authenticationDatabase admin --db=${targetDbName} --collection=${collection} --file=${jsonFile} --jsonArray --drop`,
          )

          try {
            const { stdout, stderr } = await execPromise(
              `docker exec mongodb mongoimport --username Ali --password Lourdes1102 --authenticationDatabase admin --db=${targetDbName} --collection=${collection} --file=${jsonFile} --jsonArray --drop`,
            )
            console.log("Resultado de la importación:", stdout)
            console.log("Mensajes durante la importación:", stderr)
            filesImported++
            importResults.push({
              file: jsonFile,
              collection,
              success: true,
            })
          } catch (error) {
            console.error(`Error importando archivo ${jsonFile}:`, error)
            importResults.push({
              file: jsonFile,
              collection,
              success: false,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }
      } else {
        // Buscar directorios que podrían contener datos de MongoDB (estructura de mongodump)
        console.log(`Buscando directorios en el respaldo: docker exec mongodb find ${tempDir} -type d`)
        const { stdout: dirs } = await execPromise(`docker exec mongodb find ${tempDir} -type d`)
        const dirsList = dirs
          .trim()
          .split("\n")
          .filter((dir) => dir !== tempDir)
        console.log("Directorios encontrados:", dirsList)

        if (dirsList.length > 0) {
          // Intentar usar mongorestore en el directorio completo
          console.log(`Intentando restaurar usando mongorestore en el directorio completo: ${tempDir}`)
          const restoreCommand = `docker exec mongodb mongorestore --username Ali --password Lourdes1102 --authenticationDatabase admin --db=${targetDbName} ${tempDir} --drop`
          console.log("Comando de restauración:", restoreCommand.replace(/password \w+/, "password ****"))

          try {
            const { stdout, stderr } = await execPromise(restoreCommand)
            console.log("Resultado de la restauración:", stdout)
            console.log("Mensajes durante la restauración:", stderr)
            filesImported = 1 // Contamos como un archivo importado aunque sea un directorio
            importResults.push({
              file: tempDir,
              collection: "all",
              success: true,
            })
          } catch (error) {
            console.error(`Error restaurando directorio ${tempDir}:`, error)
            importResults.push({
              file: tempDir,
              collection: "all",
              success: false,
              error: error instanceof Error ? error.message : String(error),
            })

            // Si falla la restauración completa, lanzar error
            if (filesImported === 0) {
              throw new Error(
                "No se pudieron restaurar los datos. El respaldo podría estar en un formato no compatible.",
              )
            }
          }
        } else if (filesImported === 0) {
          throw new Error("No se encontraron archivos para importar (ni JSON ni BSON)")
        }
      }
    }

    // Eliminar el directorio temporal
    console.log(`Eliminando directorio temporal: docker exec mongodb rm -rf ${tempDir}`)
    await execPromise(`docker exec mongodb rm -rf ${tempDir}`)
    console.log("Directorio temporal eliminado")

    return NextResponse.json({
      success: true,
      message: `Base de datos ${targetDbName} restaurada correctamente. ${filesImported} archivo(s) importado(s).`,
      details: importResults,
    })
  } catch (error) {
    console.error("Error restaurando respaldo:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Error restaurando respaldo",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 