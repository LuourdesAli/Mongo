import { NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

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

// Actualizar un documento
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  let client

  try {
    const id = params.id
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

    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: document })

    if (result.matchedCount === 0) {
      return NextResponse.json({ success: false, error: "Documento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Documento actualizado correctamente",
    })
  } catch (error) {
    console.error("Error actualizando documento:", error)
    return NextResponse.json({ success: false, error: "Error actualizando documento" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Eliminar un documento
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  let client

  try {
    const id = params.id
    const { dbName, collectionName } = await request.json()

    if (!dbName || !collectionName) {
      return NextResponse.json(
        { success: false, error: "Nombre de base de datos y colección requeridos" },
        { status: 400 },
      )
    }

    client = await connectToMongoDB()
    const db = client.db(dbName)
    const collection = db.collection(collectionName)

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Documento no encontrado" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: "Documento eliminado correctamente",
    })
  } catch (error) {
    console.error("Error eliminando documento:", error)
    return NextResponse.json({ success: false, error: "Error eliminando documento" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 