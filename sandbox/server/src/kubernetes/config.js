import * as k8sApi from "@kubernetes/client-node";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const kc = new k8sApi.KubeConfig();
kc.loadFromDefault();

export const k8sCorev1Api = kc.makeApiClient(k8sApi.CoreV1Api);