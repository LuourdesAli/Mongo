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
    const users = await admin.command({ usersInfo: 1 })

    // Obtener roles
    const roles = await admin.command({ rolesInfo: 1 })

    return NextResponse.json({
      success: true,
      users: users.users,
      roles: roles.roles,
    })
  } catch (error) {
    console.error("Error obteniendo información de seguridad:", error)
    return NextResponse.json({ success: false, error: "Error obteniendo información de seguridad" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Crear o modificar usuarios y roles
export async function POST(request: Request) {
  let client

  try {
    const { action, username, password, roles, databases, roleName, privileges } = await request.json()
    client = await connectToMongoDB()
    const admin = client.db("admin")

    if (action === "createUser") {
      // Crear un nuevo usuario
      const userRoles = roles.map((role: any) => {
        return { role, db: "admin" }
      })

      await admin.command({
        createUser: username,
        pwd: password,
        roles: userRoles,
      })

      return NextResponse.json({
        success: true,
        message: `Usuario ${username} creado correctamente`,
      })
    } else if (action === "createRole") {
      // Crear un nuevo rol
      await admin.command({
        createRole: roleName,
        privileges: privileges,
        roles: [],
      })

      return NextResponse.json({
        success: true,
        message: `Rol ${roleName} creado correctamente`,
      })
    }

    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en la operación de seguridad:", error)
    return NextResponse.json({ success: false, error: "Error en la operación de seguridad" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

// Eliminar usuarios y roles
export async function DELETE(request: Request) {
  let client

  try {
    const { action, username, roleName } = await request.json()
    client = await connectToMongoDB()
    const admin = client.db("admin")

    if (action === "dropUser") {
      // Eliminar un usuario
      await admin.command({
        dropUser: username,
      })

      return NextResponse.json({
        success: true,
        message: `Usuario ${username} eliminado correctamente`,
      })
    } else if (action === "dropRole") {
      // Eliminar un rol
      await admin.command({
        dropRole: roleName,
      })

      return NextResponse.json({
        success: true,
        message: `Rol ${roleName} eliminado correctamente`,
      })
    }

    return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 })
  } catch (error) {
    console.error("Error en la operación de seguridad:", error)
    return NextResponse.json({ success: false, error: "Error en la operación de seguridad" }, { status: 500 })
  } finally {
    if (client) {
      await client.close()
    }
  }
}

///ya funciona no mover nada todo esta funcionando aqui. 