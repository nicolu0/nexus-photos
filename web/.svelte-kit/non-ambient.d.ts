
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/gmail" | "/api/gmail/getThreads" | "/api/oauth" | "/api/oauth/google" | "/api/oauth/google/callback" | "/api/photo" | "/api/sms" | "/api/sms/incoming" | "/api/workorders" | "/api/workorders/approveSuggestion" | "/api/workorders/getSuggestion" | "/photos" | "/workorders";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/api": Record<string, never>;
			"/api/gmail": Record<string, never>;
			"/api/gmail/getThreads": Record<string, never>;
			"/api/oauth": Record<string, never>;
			"/api/oauth/google": Record<string, never>;
			"/api/oauth/google/callback": Record<string, never>;
			"/api/photo": Record<string, never>;
			"/api/sms": Record<string, never>;
			"/api/sms/incoming": Record<string, never>;
			"/api/workorders": Record<string, never>;
			"/api/workorders/approveSuggestion": Record<string, never>;
			"/api/workorders/getSuggestion": Record<string, never>;
			"/photos": Record<string, never>;
			"/workorders": Record<string, never>
		};
		Pathname(): "/" | "/api" | "/api/" | "/api/gmail" | "/api/gmail/" | "/api/gmail/getThreads" | "/api/gmail/getThreads/" | "/api/oauth" | "/api/oauth/" | "/api/oauth/google" | "/api/oauth/google/" | "/api/oauth/google/callback" | "/api/oauth/google/callback/" | "/api/photo" | "/api/photo/" | "/api/sms" | "/api/sms/" | "/api/sms/incoming" | "/api/sms/incoming/" | "/api/workorders" | "/api/workorders/" | "/api/workorders/approveSuggestion" | "/api/workorders/approveSuggestion/" | "/api/workorders/getSuggestion" | "/api/workorders/getSuggestion/" | "/photos" | "/photos/" | "/workorders" | "/workorders/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}