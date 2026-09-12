import { k8sCorev1Api } from "./config.js";

export const createService = async (sandboxId) => {
    const serviceManifest = {
        metadata: {
            name: `sandbox-service-${sandboxId}`,
            labels: {
                app: "sandbox-preview",
                sandboxId: sandboxId
            }
        },
        spec: {
            selector: {
                app: "sandbox-preview",
                sandboxId: sandboxId
            },
            ports: [
                {
                    name: "http",
                    port: 80,
                    targetPort: 5173,
                    protocol: "TCP"
                },
                {
                    name: "agent-http",
                    port: 3000,
                    targetPort: 3000,
                    protocol: "TCP"
                }
            ],
            type: "ClusterIP"
        }
    };

    const response = await k8sCorev1Api.createNamespacedService({
        namespace: "default",
        body: serviceManifest
    });

    return response;
};

export async function deleteService(sandboxId) {
    console.log("k8sCorev1Api:", k8sCorev1Api);
    console.log(
        "deleteNamespacedService:",
        typeof k8sCorev1Api.deleteNamespacedService
    );

    const serviceName = `sandbox-service-${sandboxId}`;

    const response = await k8sCorev1Api.deleteNamespacedService({
        namespace: "default",
        name: serviceName
    });

    return response;
}