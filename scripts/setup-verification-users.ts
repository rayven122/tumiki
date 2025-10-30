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

	// 共有組織ID
	const organizationId = "org_verification|user";

	// 1. 不要な組織を削除（org_verification|admin）
	const oldOrgId = "org_verification|admin";
	try {
		await db.organizationMember.deleteMany({
			where: { organizationId: oldOrgId },
		});
		await db.organization.delete({
			where: { id: oldOrgId },
		});
		console.log(`✅ Deleted old organization: ${oldOrgId}`);
	} catch (error) {
		// 組織が存在しない場合はスキップ
		console.log(`ℹ️  Old organization not found: ${oldOrgId}`);
	}

	// 2. 先にユーザーを作成（組織のcreatedBy制約を満たすため）
	for (const user of users) {
		await db.user.upsert({
			where: { id: user.id },
			update: {},
			create: user,
		});
		console.log(`✅ Created verification user: ${user.email}`);
	}

	// 3. 共有組織を作成（既存の場合はスキップ）
	const organization = await db.organization.upsert({
		where: { id: organizationId },
		update: {},
		create: {
			id: organizationId,
			name: "Verification Organization",
			description: "Shared organization for verification users",
			isPersonal: false,
			maxMembers: 10,
			createdBy: "verification|user",
		},
	});
	console.log(`✅ Created shared organization: ${organization.name}`);

	// 4. 各ユーザーを組織に追加
	for (const user of users) {
		// 組織メンバーシップを作成（既存の場合はスキップ）
		await db.organizationMember.upsert({
			where: {
				organizationId_userId: {
					organizationId: organizationId,
					userId: user.id,
				},
			},
			update: {},
			create: {
				organizationId: organizationId,
				userId: user.id,
				isAdmin: true,
			},
		});
		console.log(`✅ Created organization membership for: ${user.email}`);

		// ユーザーのdefaultOrganizationIdを更新
		await db.user.update({
			where: { id: user.id },
			data: { defaultOrganizationId: organizationId },
		});
		console.log(
			`✅ Set default organization for ${user.email}: ${organizationId}`,
		);
	}

	console.log("✅ Verification users setup complete");
};

setupVerificationUsers()
	.catch(console.error)
	.finally(() => db.$disconnect());
