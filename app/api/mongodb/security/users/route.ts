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

// Obtener usuarios
export async function GET() {
  let client

  try {
    client = await connectToMongoDB()
    const admin = client.db("admin")

    // Obtener usuarios
    const result = await admin.command({ usersInfo: 1 })

    return NextResponse.json({
      success: true,
      users: result.users,
    })
  } catch (error) {
    console.error("Error obteniendo usuarios:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo usuarios" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Crear un nuevo usuario
export async function POST(request: Request) {
  let client

  try {
    const { username, password, role, databases } = await request.json()

    if (!username || !password || !role) {
      return NextResponse.json({ success: false, error: "Usuario, contraseña y rol requeridos" }, { status: 400 })
    }

    client = await connectToMongoDB()
    const admin = client.db("admin")

    // Crear roles para cada base de datos
    const userRoles =
      databases && databases.length > 0 ? databases.map((db: any) => ({ role, db })) : [{ role, db: "admin" }]

    // Crear usuario
    await admin.command({
      createUser: username,
      pwd: password,
      roles: userRoles,
    })

    return NextResponse.json({
      success: true,
      message: `Usuario ${username} creado correctamente`,
    })
  } catch (error) {
    console.error("Error creando usuario:", error)
    return NextResponse.json({ success: false, error: "Error creando usuario" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 