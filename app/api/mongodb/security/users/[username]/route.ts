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

// Eliminar un usuario
export async function DELETE(request: Request, { params }: { params: { username: string } }) {
  let client

  try {
    const username = params.username

    if (username === "admin") {
      return NextResponse.json(
        { success: false, error: "No se puede eliminar el usuario administrador" },
        { status: 400 },
      )
    }

    client = await connectToMongoDB()
    const admin = client.db("admin")

    // Eliminar usuario
    await admin.command({
      dropUser: username,
    })

    return NextResponse.json({
      success: true,
      message: `Usuario ${username} eliminado correctamente`,
    })
  } catch (error) {
    console.error("Error eliminando usuario:", error)
    return NextResponse.json({ success: false, error: "Error eliminando usuario" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 