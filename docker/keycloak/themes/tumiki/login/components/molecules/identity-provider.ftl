<#import "/assets/providers/providers.ftl" as providerIcons>

<#macro kw providers=[] labelKey="loginWithProvider">
  <div class="tumiki-provider-list">
    <#list providers as provider>
      <a
        data-provider="${provider.alias}"
        href="${provider.loginUrl}"
        class="tumiki-provider-button"
      >
        <div class="tumiki-provider-main">
          <#if providerIcons[provider.alias]??>
            <div class="tumiki-provider-icon">
              <div class="tumiki-provider-icon-inner">
                <@providerIcons[provider.alias] />
              </div>
            </div>
          </#if>
          <span class="tumiki-provider-label">
            ${msg(labelKey, provider.displayName!provider.alias)}
          </span>
        </div>
        <svg class="tumiki-provider-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
        </svg>
      </a>
    </#list>
  </div>
</#macro>
