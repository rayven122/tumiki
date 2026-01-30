<#import "template.ftl" as layout>
<#import "components/molecules/identity-provider.ftl" as identityProvider>

<@layout.registrationLayout
  displayInfo=false
  displayMessage=!messagesPerField.existsError("username", "password")
  ;
  section
>
  <#if section="header">
    <#-- ヘッダーは空（ロゴはテンプレートで表示） -->
  <#elseif section="form">
    <#-- タイトルとサブタイトル -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <h1 style="font-size: 1.875rem; font-weight: 800; background: linear-gradient(to right, #4f46e5, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin-bottom: 0.75rem;">
        ${msg("welcomeBack")}
      </h1>
      <p style="font-size: 0.875rem; font-weight: 500; color: #4b5563;">
        ${msg("platformDescription")}
        <br />
        <span style="color: #4f46e5;">${msg("loginWithGooglePrompt")}</span>
      </p>
    </div>
    <#-- ソーシャルログインボタン -->
    <#if realm.password && social.providers??>
      <@identityProvider.kw providers=social.providers />
    </#if>
    <#-- グラデーション区切り線 -->
    <div style="margin-top: 1.5rem; margin-bottom: 1.5rem; height: 2px; background: linear-gradient(to right, #e0e7ff, #f3e8ff, #e0e7ff);"></div>
    <#-- 新規登録リンク -->
    <div style="text-align: center; margin-bottom: 1.5rem;">
      <span style="font-size: 0.875rem; color: #6b7280;">${msg("noAccountYet")} </span>
      <a href="${url.registrationUrl}" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5; text-decoration: underline;">${msg("registerLink")}</a>
    </div>
    <#-- 言語切り替え -->
    <#if realm.internationalizationEnabled && locale.supported?size gt 1>
      <div style="text-align: center; margin-top: 1rem;">
        <div style="display: flex; justify-content: center; gap: 1rem;">
          <#list locale.supported as l>
            <#if l.languageTag == locale.currentLanguageTag>
              <span style="font-size: 0.875rem; color: #6b7280;">${l.label}</span>
            <#else>
              <a href="${l.url}" style="font-size: 0.875rem; font-weight: 600; color: #4f46e5; text-decoration: none;">${l.label}</a>
            </#if>
          </#list>
        </div>
      </div>
    </#if>
  <#elseif section="info">
    <#-- 登録リンクは非表示 -->
  <#elseif section="socialProviders">
    <#-- ソーシャルプロバイダーはformセクションで表示するため、ここでは非表示 -->
  </#if>
</@layout.registrationLayout>
