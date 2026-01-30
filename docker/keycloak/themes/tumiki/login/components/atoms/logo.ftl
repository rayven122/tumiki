<#macro kw>
  <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 1rem;">
    <div style="position: relative;">
      <#-- グロー効果 -->
      <div style="position: absolute; inset: -8px; background: linear-gradient(to right, #6366f1, #a855f7); opacity: 0.25; filter: blur(20px); border-radius: 9999px;"></div>
      <img src="${url.resourcesPath}/img/logo.svg" alt="Tumiki" style="position: relative; width: 64px; height: 64px;" />
    </div>
  </div>
  <#-- nested content (loginTitleHtml) は表示しない -->
</#macro>
