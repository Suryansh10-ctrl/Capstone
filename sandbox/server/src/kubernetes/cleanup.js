import { k8sCorev1Api } from "./config.js";

export async function cleanupOldSandboxes(keepRecentCount = 1) {
    try {
        const podsRes = await k8sCorev1Api.listNamespacedPod({
            namespace: "default",
            labelSelector: "app=sandbox-preview"
        });
        const pods = podsRes.items || [];
        if (pods.length <= keepRecentCount) return;

        // Sort by creationTimestamp descending (newest first)
        pods.sort((a, b) => new Date(b.metadata?.creationTimestamp || 0) - new Date(a.metadata?.creationTimestamp || 0));

        // Delete pods beyond keepRecentCount
        const toDelete = pods.slice(keepRecentCount);
        for (const pod of toDelete) {
            const name = pod.metadata?.name;
            const sandboxId = pod.metadata?.labels?.sandboxId;
            if (name) {
                console.log(`[Cleanup] Deleting old sandbox pod: ${name}`);
                await k8sCorev1Api.deleteNamespacedPod({ name, namespace: "default" }).catch(() => {});
            }
            if (sandboxId) {
                const svcName = `sandbox-service-${sandboxId}`;
                console.log(`[Cleanup] Deleting old sandbox service: ${svcName}`);
                await k8sCorev1Api.deleteNamespacedService({ name: svcName, namespace: "default" }).catch(() => {});
            }
        }
    } catch (err) {
        console.warn("[Cleanup] Warning cleaning up old sandboxes:", err.message);
    }
}

export async function getSandboxStatus(sandboxId) {
    try {
        const podName = `sandbox-pod-${sandboxId}`;
        const podRes = await k8sCorev1Api.readNamespacedPodStatus({
            name: podName,
            namespace: "default"
        });
        const phase = podRes.status?.phase;
        const containerStatuses = podRes.status?.containerStatuses || [];
        const allReady = containerStatuses.length >= 2 && containerStatuses.every(c => c.ready);
        return {
            phase,
            allReady,
            containerStatuses: containerStatuses.map(c => ({ name: c.name, ready: c.ready }))
        };
    } catch (err) {
        return { phase: "Unknown", allReady: false, error: err.message };
    }
}
