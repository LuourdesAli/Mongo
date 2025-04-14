import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Esta es una función de ayuda para conectar a MongoDB
async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://Lulu:Lourdes1102@localhost:27017"
  const client = new MongoClient(uri)

  try {
    await client.connect()
    return client
  } catch (error) {
    console.error("Error conectando a MongoDB:", error)
    throw error
  }
}

// Obtener todas las bases de datos
export async function GET() {
  let client

  try {
    client = await connectToMongoDB()
    const admin = client.db().admin()
    const dbInfo = await admin.listDatabases()

    return NextResponse.json({
      success: true,
      databases: dbInfo.databases,
    })
  } catch (error) {
    console.error("Error obteniendo bases de datos:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo bases de datos" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Crear una nueva base de datos o colección
export async function POST(request: Request) {
  let client

  try {
    const { action, dbName, collectionName } = await request.json()
    client = await connectToMongoDB()

    if (action === "createDatabase") {
      // En MongoDB, las bases de datos se crean implícitamente al crear una colección
      const db = client.db(dbName)
      await db.createCollection("_setup")

      return NextResponse.json({
        success: true,
        message: `Base de datos ${dbName} creada correctamente`,
      })
    } else if (action === "createCollection") {
      const db = client.db(dbName)
      await db.createCollection(collectionName)

      return NextResponse.json({
        success: true,
        message: `Colección ${collectionName} creada correctamente en ${dbName}`,
      })
    }

    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en la operación:", error)
    return NextResponse.json({ success: false, error: "Error en la operación" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui