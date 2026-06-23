// Node >= 22 exposes `localStorage` as a global that evaluates to `undefined`
// unless the process is started with `--localstorage-file`. cofhejs persists
// FHE permits through a zustand store that defaults to browser `localStorage`,
// and zustand only guards against that global *throwing* (older Node raised a
// ReferenceError). An `undefined` value slips past the guard and later crashes
// on `storage.setItem`. Supplying a minimal in-memory implementation before
// cofhejs loads restores the intended Node fallback.
// Read the property descriptor rather than the value: touching Node's native
// `localStorage` getter emits a noisy ExperimentalWarning, so we detect whether
// a usable implementation is already present without invoking it.
const existing = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
const alreadyShimmed = existing !== undefined && 'value' in existing && existing.value != null

if (!alreadyShimmed) {
	const store = new Map<string, string>()
	const memoryLocalStorage = {
		getItem: (key: string): string | null => (store.has(key) ? store.get(key)! : null),
		setItem: (key: string, value: string): void => {
			store.set(key, String(value))
		},
		removeItem: (key: string): void => {
			store.delete(key)
		},
		clear: (): void => {
			store.clear()
		},
		key: (index: number): string | null => Array.from(store.keys())[index] ?? null,
		get length(): number {
			return store.size
		},
	}
	Object.defineProperty(globalThis, 'localStorage', {
		value: memoryLocalStorage,
		writable: false,
		configurable: true,
	})
}
