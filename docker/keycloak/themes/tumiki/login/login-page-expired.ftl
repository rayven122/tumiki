<#import "template.ftl" as layout>

<@layout.registrationLayout; section>
  <#if section="header">
    <#-- ヘッダーは空 -->
  <#elseif section="form">
    <div class="tumiki-auth-heading">
      <h1 class="tumiki-auth-title">
        ${msg("pageExpiredTitle")}
      </h1>
      <p class="tumiki-auth-copy">
        ${msg("pageExpiredMsg1")}
      </p>
    </div>
    <a href="${url.loginRestartFlowUrl}" class="tumiki-button tumiki-button-link">
      ${msg("doTryAgain")}
    </a>
  </#if>
</@layout.registrationLayout>
