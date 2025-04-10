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

// Eliminar un rol
export async function DELETE(request: Request, { params }: { params: { roleName: string } }) {
  let client

  try {
    const roleName = params.roleName
    const { db } = await request.json()

    if (!db) {
      return NextResponse.json({ success: false, error: "Base de datos requerida" }, { status: 400 })
    }

    if (roleName === "root" || roleName === "dbOwner" || roleName === "userAdmin") {
      return NextResponse.json({ success: false, error: "No se puede eliminar un rol integrado" }, { status: 400 })
    }

    client = await connectToMongoDB()
    const adminDb = client.db(db)

    // Eliminar rol
    await adminDb.command({
      dropRole: roleName,
    })

    return NextResponse.json({
      success: true,
      message: `Rol ${roleName} eliminado correctamente`,
    })
  } catch (error) {
    console.error("Error eliminando rol:", error)
    return NextResponse.json({ success: false, error: "Error eliminando rol" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 