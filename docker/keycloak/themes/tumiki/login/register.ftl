<#import "template.ftl" as layout>
<#import "components/molecules/identity-provider.ftl" as identityProvider>

<@layout.registrationLayout
  displayInfo=false
  displayMessage=!messagesPerField.existsError("firstName", "lastName", "email", "password", "password-confirm")
  ;
  section
>
  <#if section="header">
    <#-- ヘッダーは空（ロゴはテンプレートで表示） -->
  <#elseif section="form">
    <#assign hasSocialProviders = social.providers?? && social.providers?size gt 0>
    <#assign showLocalRegistrationForm = realm.password && !hasSocialProviders>
    <div class="tumiki-auth-heading">
      <h1 class="tumiki-auth-title">
        ${msg("welcomeNew")}
      </h1>
      <p class="tumiki-auth-copy">
        ${msg("platformDescription")}
      </p>
    </div>
    <#-- ソーシャルログインボタン（新規登録用） -->
    <#if hasSocialProviders>
      <@identityProvider.kw providers=social.providers labelKey="continueWithProvider" />
    </#if>
    <#-- Email/Password登録フォーム -->
    <#if showLocalRegistrationForm>
      <form action="${url.registrationAction}" method="post">
        <div class="tumiki-field">
          <label for="firstName" class="tumiki-label">
            ${msg("firstName")}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            autocomplete="given-name"
            value="${(register.formData.firstName)!''}"
            class="tumiki-input<#if messagesPerField.existsError('firstName')> tumiki-input-error</#if>"
          />
          <#if messagesPerField.existsError("firstName")>
            <p class="tumiki-error">${kcSanitize(messagesPerField.get("firstName"))}</p>
          </#if>
        </div>
        <div class="tumiki-field">
          <label for="lastName" class="tumiki-label">
            ${msg("lastName")}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autocomplete="family-name"
            value="${(register.formData.lastName)!''}"
            class="tumiki-input<#if messagesPerField.existsError('lastName')> tumiki-input-error</#if>"
          />
          <#if messagesPerField.existsError("lastName")>
            <p class="tumiki-error">${kcSanitize(messagesPerField.get("lastName"))}</p>
          </#if>
        </div>
        <#-- Emailフィールド -->
        <div class="tumiki-field">
          <label for="email" class="tumiki-label">
            ${msg("emailLabel")} <span class="tumiki-required">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autocomplete="email"
            autofocus
            value="${(register.formData.email)!''}"
            class="tumiki-input<#if messagesPerField.existsError('email')> tumiki-input-error</#if>"
          />
          <#if messagesPerField.existsError("email")>
            <p class="tumiki-error">${kcSanitize(messagesPerField.get("email"))}</p>
          </#if>
        </div>
        <#-- Passwordフィールド -->
        <div class="tumiki-field">
          <label for="password" class="tumiki-label">
            ${msg("passwordLabel")} <span class="tumiki-required">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autocomplete="new-password"
            class="tumiki-input<#if messagesPerField.existsError('password')> tumiki-input-error</#if>"
          />
          <#if messagesPerField.existsError("password")>
            <p class="tumiki-error">${kcSanitize(messagesPerField.get("password"))}</p>
          </#if>
        </div>
        <#-- Password確認フィールド -->
        <div class="tumiki-field tumiki-field-large">
          <label for="password-confirm" class="tumiki-label">
            ${msg("passwordConfirmLabel")} <span class="tumiki-required">*</span>
          </label>
          <input
            id="password-confirm"
            name="password-confirm"
            type="password"
            autocomplete="new-password"
            class="tumiki-input<#if messagesPerField.existsError('password-confirm')> tumiki-input-error</#if>"
          />
          <#if messagesPerField.existsError("password-confirm")>
            <p class="tumiki-error">${kcSanitize(messagesPerField.get("password-confirm"))}</p>
          </#if>
        </div>
        <#-- 登録ボタン -->
        <button
          type="submit"
          class="tumiki-button"
        >
          ${msg("doRegister")}
        </button>
      </form>
    </#if>
    <#-- ログインリンクは常に表示するため、区切り線も常に表示する。 -->
    <div class="tumiki-divider"></div>
    <#-- ログインリンク -->
    <div class="tumiki-footer-link">
      <span class="tumiki-muted">${msg("alreadyHaveAccount")} </span>
      <a href="${url.loginUrl}" class="tumiki-link">${msg("loginLink")}</a>
    </div>
    <#-- 利用規約 -->
    <p class="tumiki-terms">
      ${msg("termsNotice")}
      <a href="${properties.termsUrl}" class="tumiki-link">${msg("termsOfService")}</a>
      ${msg("andText")}
      <a href="${properties.privacyUrl}" class="tumiki-link">${msg("privacyPolicy")}</a>
      ${msg("agreeNotice")}
    </p>
    <#-- 言語切り替え -->
    <#if realm.internationalizationEnabled && locale.supported?size gt 1>
      <div class="tumiki-language-switch">
        <div class="tumiki-language-switch-inner">
          <#list locale.supported as l>
            <#if l.languageTag == locale.currentLanguageTag>
              <span class="tumiki-muted">${l.label}</span>
            <#else>
              <a href="${l.url}" class="tumiki-link">${l.label}</a>
            </#if>
          </#list>
        </div>
      </div>
    </#if>
  <#elseif section="info">
    <#-- 情報セクションは非表示 -->
  <#elseif section="socialProviders">
    <#-- ソーシャルプロバイダーはformセクションで表示するため、ここでは非表示 -->
  </#if>
</@layout.registrationLayout>
