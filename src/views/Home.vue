<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- <ion-grid>
        <ion-col>
      </ion-grid> -->
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
                  <ion-label position="fixed">广播方式</ion-label>
                  <ion-select v-model="boardcastMatrixType">
                    <ion-select-option
                      v-for="bmitem in allBoardcastMatrixType"
                      :key="bmitem[0]"
                      :value="bmitem[1]"
                      >{{ bmitem[1] }}</ion-select-option
                    >
                  </ion-select>
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
              >生成/重置网络</ion-button
            >
          </ion-card-content>
        </ion-grid>
      </ion-card>

      <ion-card>
        <ion-card-header>
          <ion-card-title>矩阵网格</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <canvas class="matrixView" ref="canvas"></canvas>
          <ion-buttons class="controller-bar">
            <ion-button
              v-if="!boardcastReady"
              fill="outline"
              @click="prepareBroadcast()"
            >
              <ion-icon
                slot="start"
                :icon="icon.playSkipForwardCircleOutline"
              ></ion-icon>
              准备开始广播
            </ion-button>
            <template v-else>
              <ion-button
                fill="outline"
                @click="stepInBroadcast()"
                :disabled="canStepInBroadcast"
              >
                <ion-icon
                  slot="start"
                  :icon="icon.playCircleOutline"
                ></ion-icon>
                广播步进({{ boardcastStepCount }})
              </ion-button>
              <ion-button fill="outline" @click="abortBroadcast()">
                <ion-icon slot="start" :icon="icon.stopOutline"></ion-icon>
                停止广播
              </ion-button>
              <ion-button
                fill="outline"
                v-if="autoBoardcastStepIn"
                @click="stopAutoBoardcastStepIn()"
              >
                <ion-icon
                  slot="start"
                  :icon="icon.stopCircleOutline"
                ></ion-icon>
                停止自动步进
              </ion-button>
              <ion-button
                v-else
                fill="outline"
                @click="startAutoBoardcastStepIn()"
                :disabled="canStepInBroadcast"
              >
                <ion-icon
                  slot="start"
                  :icon="icon.playForwardCircleOutline"
                ></ion-icon>
                自动步进
              </ion-button>
            </template>
          </ion-buttons>
        </ion-card-content>
      </ion-card>

      <ion-card v-show="boardcastLogs.length">
        <ion-card-header>
          <ion-card-title>调试日志面板</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="log-panel">
            <p class="log-item" v-for="item in boardcastLogs" :key="item.time">
              <span class="log-time">{{ item.time }}</span>
              <span
                :class="['log-message', 'log-type-' + item.type]"
                v-html="item.log"
              ></span>
            </p>
          </div>
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
.controller-bar {
  margin-block-start: 1em;
  flex-wrap: wrap;
}
.controller-bar > * {
  margin-block-start: 0.3em !important;
}
.log-panel {
  max-height: 20em;
  overflow: auto;
}
.log-item {
  font-size: 12px;
  font-weight: lighter;
}
.log-time {
  color: #9e9e9e;
  padding-inline-end: 0.5em;
}
.log-type-success {
  color: #4caf50;
}
.log-type-info {
  color: #2196f3;
}
</style>
