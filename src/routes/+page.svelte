<script lang="ts">
    export let data: {
        config: {
            fromNumber: string | null;
            landlordNumber: string | null;
            vendorNumber: string | null;
        };
        events: {
            id: string;
            direction: 'inbound' | 'outbound';
            at: string;
            from: string;
            to: string;
            body: string;
        }[];
    };

    let to = data.config.vendorNumber ?? '';
    let body = '';

    async function sendTest() {
        if (!to || !body) return;

        const res = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, body })
        });

        if (res.ok) {
            body = '';
            const eventsRes = await fetch('/api/events');
            const json = await eventsRes.json();
            data.events = json.events;
        } else {
            console.error('send failed', await res.text());
        }
    }

    function formatTime(iso: string) {
        return new Date(iso).toLocaleString();
    }
</script>

<main class="min-h-screen bg-slate-950 text-slate-100 flex justify-center px-4 py-8">
    <div class="w-full max-w-6xl grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)]">
        <!-- Left: Config + send test -->
        <section
            class="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl shadow-slate-950/40 p-6 flex flex-col gap-6"
        >
            <div class="space-y-1">
                <h1 class="text-xl md:text-2xl font-semibold tracking-tight">
                    Sinch SMS v0 Dashboard
                </h1>
                <p class="text-sm text-slate-400">
                    Landlord &rarr; Sinch number &rarr; vendor bridge for early product testing.
                </p>
            </div>

            <!-- Config card -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
                <h2 class="text-sm font-semibold text-slate-200 uppercase tracking-[0.12em]">
                    Connection Details
                </h2>

                <div class="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1.5 text-sm">
                    <span class="text-slate-400">Sinch number:</span>
                    <span class="font-medium text-slate-100">
                        {data.config.fromNumber ?? '—'}
                    </span>

                    <span class="text-slate-400">Landlord (you):</span>
                    <span class="font-medium text-slate-100">
                        {data.config.landlordNumber ?? '—'}
                    </span>

                    <span class="text-slate-400">Vendor (mock):</span>
                    <span class="font-medium text-slate-100">
                        {data.config.vendorNumber ?? '—'}
                    </span>
                </div>

                <p class="text-xs text-slate-500 mt-2">
                    Any SMS from <span class="font-semibold">Landlord</span> to the
                    <span class="font-semibold">Sinch number</span> is automatically forwarded
                    to the <span class="font-semibold">Vendor</span>.
                </p>
            </div>

            <!-- Send test message -->
            <div class="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
                <div class="flex items-baseline justify-between gap-2">
                    <h2 class="text-sm font-semibold text-slate-200 uppercase tracking-[0.12em]">
                        Send Test Message
                    </h2>
                    <p class="text-[0.7rem] text-slate-500">
                        This uses the same Sinch backend your SMS flow will.
                    </p>
                </div>

                <div class="space-y-3">
                    <label class="block text-xs font-medium text-slate-300">
                        To
                        <input
                            class="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 transition"
                            bind:value={to}
                            placeholder="+1XXXXXXXXXX"
                        />
                    </label>

                    <label class="block text-xs font-medium text-slate-300">
                        Body
                        <textarea
                            class="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 outline-none ring-0 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50 transition resize-none"
                            rows="4"
                            bind:value={body}
                            placeholder="Leak under kitchen sink in Unit 3B."
                        />
                    </label>
                </div>

                <div class="flex items-center justify-between gap-3 pt-1">
                    <button
                        type="button"
                        on:click={sendTest}
                        disabled={!to || !body}
                        class="inline-flex items-center justify-center rounded-full bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Send SMS
                    </button>

                    <p class="text-[0.7rem] text-slate-500">
                        For v0, sending from your landlord phone directly to the Sinch number
                        is the main test path.
                    </p>
                </div>
            </div>
        </section>

        <!-- Right: Event stream -->
        <section
            class="bg-slate-900/80 border border-slate-800 rounded-2xl shadow-xl shadow-slate-950/40 p-6 flex flex-col"
        >
            <div class="flex items-baseline justify-between gap-2 mb-4">
                <h2 class="text-sm font-semibold text-slate-200 uppercase tracking-[0.12em]">
                    Recent Events
                </h2>
                <span class="text-[0.7rem] text-slate-500">
                    Last {data.events.length} message{data.events.length === 1 ? '' : 's'}
                </span>
            </div>

            {#if data.events.length === 0}
                <p class="text-sm text-slate-500">
                    No events yet. Text your Sinch number from the landlord phone to start the flow.
                </p>
            {:else}
                <ul class="space-y-3 overflow-y-auto pr-1 max-h-[70vh]">
                    {#each data.events as e}
                        <li
                            class="rounded-xl border px-3.5 py-3 text-xs md:text-[0.8rem] bg-slate-900/70 border-slate-800/90 flex flex-col gap-1.5
                                {e.direction === 'outbound'
                                    ? 'ring-1 ring-emerald-400/40'
                                    : 'ring-1 ring-slate-700/40'}"
                        >
                            <div class="flex items-center justify-between gap-2">
                                <div class="flex items-center gap-2">
                                    <span
                                        class="inline-flex items-center rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em]
                                            {e.direction === 'outbound'
                                                ? 'bg-emerald-500/10 text-emerald-300'
                                                : 'bg-slate-500/10 text-slate-300'}"
                                    >
                                        {e.direction}
                                    </span>
                                </div>
                                <span class="text-[0.65rem] text-slate-500">
                                    {formatTime(e.at)}
                                </span>
                            </div>

                            <div class="flex items-center gap-1 text-[0.7rem] text-slate-400">
                                <span class="truncate max-w-[40%]">{e.from}</span>
                                <span class="text-slate-500">→</span>
                                <span class="truncate max-w-[40%]">{e.to}</span>
                            </div>

                            <pre class="mt-1 whitespace-pre-wrap text-[0.7rem] text-slate-100">
                                {e.body}
                            </pre>
                        </li>
                    {/each}
                </ul>
            {/if}
        </section>
    </div>
</main>
