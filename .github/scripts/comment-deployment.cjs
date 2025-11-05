module.exports = async ({
  github,
  context,
  vercelUrl,
  cloudrunUrl,
  environment,
  isPR,
}) => {
  if (isPR) {
    const comment = `🚀 **Preview deployment ready!**

🔗 **Manager (Vercel):** ${vercelUrl}
🔗 **MCP Proxy (Cloud Run):** ${cloudrunUrl}
📦 **Environment:** ${environment}
🔄 **Status:** Ready

*This preview will be updated automatically on new commits.*`;

    // Find existing comment
    const { data: comments } = await github.rest.issues.listComments({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: context.issue.number,
    });

    const botComment = comments.find(
      (comment) =>
        comment.user.type === "Bot" &&
        comment.body.includes("Preview deployment ready"),
    );

    if (botComment) {
      // Update existing comment
      await github.rest.issues.updateComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: botComment.id,
        body: comment,
      });
      console.log("Updated existing deployment comment");
    } else {
      // Create new comment
      await github.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
        body: comment,
      });
      console.log("Created new deployment comment");
    }
  }
};
