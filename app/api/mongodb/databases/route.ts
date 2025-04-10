import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Conectar a MongoDB
async function connectToMongoDB() {
  const uri = process.env.MONGODB_URI || "mongodb://Ali:Lourdes1102@localhost:27017"
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

// Crear una nueva base de datos
export async function POST(request: Request) {
  let client

  try {
    const { dbName } = await request.json()

    if (!dbName) {
      return NextResponse.json({ success: false, error: "Nombre de base de datos requerido" }, { status: 400 })
    }

    client = await connectToMongoDB()

    // En MongoDB, las bases de datos se crean implícitamente al crear una colección
    const db = client.db(dbName)
    await db.createCollection("_setup")

    return NextResponse.json({
      success: true,
      message: `Base de datos ${dbName} creada correctamente`,
    })
  } catch (error) {
    console.error("Error creando base de datos:", error)
    return NextResponse.json({ success: false, error: "Error creando base de datos" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 