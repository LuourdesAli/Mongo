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

// Obtener colecciones de una base de datos
export async function GET(request: Request) {
  let client

  try {
    const { searchParams } = new URL(request.url)
    const dbName = searchParams.get("db")

    if (!dbName) {
      return NextResponse.json({ success: false, error: "Nombre de base de datos requerido" }, { status: 400 })
    }

    client = await connectToMongoDB()
    const db = client.db(dbName)

    // Obtener colecciones
    const collections = await db.listCollections().toArray()

    // Obtener estadísticas para cada colección
    const collectionsWithStats = await Promise.all(
      collections.map(async (collection) => {
        const stats = await db.command({ collStats: collection.name })
        return {
          name: collection.name,
          count: stats.count,
          size: stats.size,
        }
      }),
    )

    return NextResponse.json({
      success: true,
      collections: collectionsWithStats,
    })
  } catch (error) {
    console.error("Error obteniendo colecciones:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo colecciones" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Crear una nueva colección
export async function POST(request: Request) {
  let client

  try {
    const { dbName, collectionName } = await request.json()

    if (!dbName || !collectionName) {
      return NextResponse.json(
        { success: false, error: "Nombre de base de datos y colección requeridos" },
        { status: 400 },
      )
    }

    client = await connectToMongoDB()
    const db = client.db(dbName)

    await db.createCollection(collectionName)

    return NextResponse.json({
      success: true,
      message: `Colección ${collectionName} creada correctamente`,
    })
  } catch (error) {
    console.error("Error creando colección:", error)
    return NextResponse.json({ success: false, error: "Error creando colección" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 