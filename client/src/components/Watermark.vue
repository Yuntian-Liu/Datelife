<script setup>
const enabled = import.meta.env.VITE_ENABLE_WATERMARK !== 'false'

const line1 = '开发预览版 · 非最终产品'
const line2 = 'https://datelife.ytunx.com'

function buildSvg() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120">
    <g transform="rotate(-22, 100, 60)">
      <text x="100" y="50" text-anchor="middle" fill="rgba(148,163,184,0.18)" font-size="13" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${line1}</text>
      <text x="100" y="72" text-anchor="middle" fill="rgba(148,163,184,0.14)" font-size="12" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${line2}</text>
    </g>
  </svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
</script>

<template>
  <div v-if="enabled" class="watermark"></div>
</template>

<style>
.watermark {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-image: v-bind(buildSvg());
  background-repeat: repeat;
  background-size: 200px 120px;
}
</style>
