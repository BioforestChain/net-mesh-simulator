<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ title }}</ion-title>
        </ion-toolbar>
      </ion-header>
      <ion-card>
        <ion-grid id="controller-panel">
          <ion-card-header>
            <ion-card-title>矩阵定制面板</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-row>
              <ion-col size="12" size-sm>
                <ion-item>
                  <ion-label position="fixed">矩阵大小</ion-label>
                  <ion-input type="number" v-model="matrixGenOptions.edgeSize">
                  </ion-input>
                </ion-item>
              </ion-col>
              <ion-col size="12" size-sm>
                <ion-item>
                  <ion-label position="fixed">最大互连率</ion-label>
                  <ion-input
                    class="text-right"
                    type="number"
                    inputmode="decimal"
                    max="100"
                    step="0.1"
                    min="1"
                    v-model="matrixGenOptions.maxConnectRate"
                  ></ion-input>
                  <span slot="end">%</span>
                </ion-item>
                <ion-item>
                  <ion-label position="fixed">最小互连率</ion-label>
                  <ion-input
                    class="text-right"
                    type="number"
                    inputmode="decimal"
                    max="100"
                    step="0.1"
                    min="1"
                    v-model="matrixGenOptions.minConnectRate"
                  ></ion-input>
                  <span slot="end">%</span>
                </ion-item>
              </ion-col>
            </ion-row>

            <ion-button @click="generateNetMeshAndReander()"
              >生成网络</ion-button
            >
            <ion-button v-if="!boardcastReady" @click="prepareBroadcast()"
              >准备开始广播</ion-button
            >
            <template v-else>
              <ion-button @click="stepInBroadcast()" :disabled="boardcastDone"
                >广播步进({{ boardcastStepCount }})</ion-button
              >
              <ion-button @click="abortBroadcast()">中断广播</ion-button>
            </template>
          </ion-card-content>
        </ion-grid>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>矩阵网格</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <svg
            :viewBox="`0 0 ${canvasViewBox.width} ${canvasViewBox.height}`"
            class="bg-gray-50 hidden"
          >
            <template v-for="peer in peerMatrix" :key="peer.index">
              <rect
                :x="peer.viewBound.left"
                :y="peer.viewBound.top"
                :width="peer.viewBound.width"
                :height="peer.viewBound.height"
                fill="var(--ion-color-secondary)"
              />
              <path
                :d="peer.connectedPeerPath()"
                stroke="rgba(var(--ion-color-tertiary-rgb,0.1))"
                stroke-width="1"
              />
              <!-- <template
                v-for="(cpeer, index) in peer.connectedPeers.values()"
                :key="peer.index + '/' + index"
              >
                <path
                  :d="peer.viewBound.p2pPath(cpeer.viewBound)"
                  stroke="rgba(var(--ion-color-secondary-rgb,0.5))"
                  stroke-width="1"
                />
              </template> -->
              <!-- <line :x1="peer.viewBound.centerX" :y1="peer.viewBound.centerY" x2="100" y2="20" stroke="black" stroke-width="2"/> -->
            </template>
          </svg>
          <canvas class="matrixView" ref="canvas"></canvas>
        </ion-card-content>
      </ion-card>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import Home from "./Home";
export default Home;
</script>

<style scoped>
.ion-border-style-none {
  --border-style: none;
}
.matrixView {
  width: 100%;
  height: 100%;
}
</style>
