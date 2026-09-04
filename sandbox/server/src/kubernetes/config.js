import * as k8sApi from "@kubernetes/client-node";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function getClient() {
    const kc = new k8sApi.KubeConfig();
    kc.loadFromDefault();
    return kc.makeApiClient(k8sApi.CoreV1Api);
}

export const k8sCorev1Api = new Proxy({}, {
    get(target, prop) {
        const client = getClient();
        const value = client[prop];
        if (typeof value === 'function') {
            return value.bind(client);
        }
        return value;
    }
});