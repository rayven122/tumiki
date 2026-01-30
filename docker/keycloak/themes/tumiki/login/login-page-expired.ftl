<#import "template.ftl" as layout>

<@layout.registrationLayout; section>
  <#if section="header">
    <#-- ヘッダーは空 -->
  <#elseif section="form">
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.5rem; font-weight: 700; color: #1f2937; margin-bottom: 0.75rem;">
        ${msg("pageExpiredTitle")}
      </h1>
      <p style="font-size: 0.875rem; color: #6b7280;">
        ${msg("pageExpiredMsg1")}
      </p>
    </div>
    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
      <a
        href="${url.loginRestartFlowUrl}"
        style="display: flex; width: 100%; align-items: center; justify-content: center; border: 2px solid #000000; background-color: #4f46e5; padding: 0.875rem 1.5rem; font-weight: 700; color: #ffffff; box-shadow: 4px 4px 0px 0px #000000; text-decoration: none; transition: all 0.2s;"
        onmouseover="this.style.transform='translate(2px, 2px)'; this.style.boxShadow='2px 2px 0px 0px #000000';"
        onmouseout="this.style.transform='translate(0, 0)'; this.style.boxShadow='4px 4px 0px 0px #000000';"
      >
        ${msg("doTryAgain")}
      </a>
    </div>
  </#if>
</@layout.registrationLayout>
