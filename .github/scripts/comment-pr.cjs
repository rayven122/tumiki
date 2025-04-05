module.exports = async ({ github, context, deployUrl, project }) => {
	const prNumber = context.payload.pull_request.number;
	const searchKeyword = `プレビュー環境URL(${project}):`;
	const commentBody = `プレビュー環境URL(${project}): ${deployUrl}`;

	const comments = await github.rest.issues.listComments({
		owner: context.repo.owner,
		repo: context.repo.repo,
		issue_number: prNumber,
	});

	const commentToUpdate = comments.data.find((comment) =>
		comment.body.startsWith(searchKeyword),
	);

	if (commentToUpdate) {
		await github.rest.issues.updateComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			comment_id: commentToUpdate.id,
			body: commentBody,
		});
	} else {
		await github.rest.issues.createComment({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: prNumber,
			body: commentBody,
		});
	}
};
