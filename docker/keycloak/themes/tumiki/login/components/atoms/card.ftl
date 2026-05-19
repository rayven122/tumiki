<#macro kw content="" footer="" header="">
  <div class="tumiki-auth-card">
    <#if header?has_content>
      <div>
        ${header}
      </div>
    </#if>
    <#if content?has_content>
      <div>
        ${content}
      </div>
    </#if>
    <#if footer?has_content>
      <div class="tumiki-card-footer">
        ${footer}
      </div>
    </#if>
  </div>
</#macro>
