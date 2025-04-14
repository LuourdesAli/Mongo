import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

// Conectar a MongoDB
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

// Obtener documentos de una colección
export async function GET(request: Request) {
  let client

  try {
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get("db")
    const collectionName = searchParams.get("collection")
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    if (!dbName || !collectionName) {
      return NextResponse.json(
        { success: false, error: "Nombre de base de datos y colección requeridos" },
        { status: 400 },
      )
    }

    client = await connectToMongoDB()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    // Obtener documentos
    const documents = await collection.find().limit(limit).toArray()

    return NextResponse.json({
      success: true,
      documents,
    })
  } catch (error) {
    console.error("Error obteniendo documentos:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo documentos" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Crear un nuevo documento
export async function POST(request: Request) {
  let client

  try {
    const { dbName, collectionName, document } = await request.json()

    if (!dbName || !collectionName || !document) {
      return NextResponse.json(
        { success: false, error: "Nombre de base de datos, colección y documento requeridos" },
        { status: 400 },
      )
    }

    client = await connectToMongoDB()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    const result = await collection.insertOne(document)

    return NextResponse.json({
      success: true,
      message: "Documento creado correctamente",
      id: result.insertedId,
    })
  } catch (error) {
    console.error("Error creando documento:", error)
    return NextResponse.json({ success: false, error: "Error creando documento" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 