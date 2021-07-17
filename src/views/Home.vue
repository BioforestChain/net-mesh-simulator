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

      <ion-grid id="controller-panel">
        <ion-row>
          <ion-col size="12" size-sm>
            <ion-item>
              <ion-label position="fixed">矩阵大小</ion-label>
              <ion-input type="number"> </ion-input>
            </ion-item>
          </ion-col>
          <ion-col size="12" size-sm>
            <ion-item>
              <ion-label position="fixed">最大互连率</ion-label>
              <ion-input
                type="number"
                inputmode="decimal"
                max="100"
                step="0.1"
                min="1"
              ></ion-input>
              <span slot="end">%</span>
            </ion-item>
            <ion-item>
              <ion-label position="fixed">最小互连率</ion-label>
              <ion-input
                type="number"
                inputmode="decimal"
                max="100"
                step="0.1"
                min="1"
              ></ion-input>
              <span slot="end">%</span>
            </ion-item>
          </ion-col>
        </ion-row>

        <ion-button @click="generateNetMesh()">生成网络</ion-button>
      </ion-grid>
    </ion-content>
  </ion-page>
</template>

<script lang="ts">
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonInput,
  IonGrid,
  IonCol,
  IonRow,
  IonLabel,
  IonButton,
} from "@ionic/vue";
import { defineComponent } from "vue";

export default defineComponent({
  name: "Home",
  components: {
    IonContent,
    IonHeader,
    IonPage,
    IonTitle,
    IonToolbar,
    IonItem,
    IonInput,
    IonGrid,
    IonCol,
    IonRow,
    IonLabel,
    IonButton,
  },
  data() {
    return {
      title: "矩阵广播效率指标模拟器",
    };
  },
  methods: {
    generateNetMesh() {
      console.log(this.$data.title);
    },
  },
});
</script>

<style scoped>
.ion-border-style-none {
  --border-style: none;
}
</style>
