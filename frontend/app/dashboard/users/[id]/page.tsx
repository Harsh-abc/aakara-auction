import { users, newUsers, suspended } from "@/lib/data"



interface UserPageProps {
    params: Promise<{
        id: string
    }>
}

export default async function UserPage({
    params,
}: UserPageProps) {

    const allUsers = [...users, ...newUsers, ...suspended]

    const { id } = await params

    const user = allUsers.find((user) => user.id === Number(id))

    if (!user) {
        return <div className="p-6">User not found</div>
    }

    return (
        <div className="p-6">

            <h1 className="text-2xl font-bold">
                {user.fullName}
            </h1>

            <p>{user.email}</p>
            <p>{user.status}</p>

        </div>
    )
}