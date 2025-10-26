import { db } from "@tumiki/db/server";

const setupVerificationUsers = async () => {
	const users = [
		{
			id: "verification|admin",
			email: "admin@verification.local",
			name: "Admin User (Verification)",
			role: "SYSTEM_ADMIN" as const,
		},
		{
			id: "verification|user",
			email: "user@verification.local",
			name: "Regular User (Verification)",
			role: "USER" as const,
		},
	];

	for (const user of users) {
		await db.user.upsert({
			where: { id: user.id },
			update: {},
			create: user,
		});
		console.log(`✅ Created verification user: ${user.email}`);
	}

	console.log("✅ Verification users setup complete");
};

setupVerificationUsers()
	.catch(console.error)
	.finally(() => db.$disconnect());
