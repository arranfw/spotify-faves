/* PICKER STATE OBJECT */

interface PickerStateOptions {
	items: string[];
	getBatchSize?: (currentSize: number, settings: PickerSettings) => number;
	shouldIncludeItem?: (identifier: string, settings: PickerSettings) => boolean;
	getFilteredItems?: (settings: PickerSettings) => string[];
	defaultSettings?: PickerSettings;
}

interface PickerSettings {
	minBatchSize?: number;
	maxBatchSize?: number;
	[key: string]: unknown;
}

interface PickerStateArrays {
	eliminated: Array<{ id: string; eliminatedBy: string[] }>;
	survived: string[];
	current: string[];
	evaluating: string[];
	favorites: string[];
}

interface PickerState {
	options: PickerStateOptions;
	settings: PickerSettings;
	items: string[];
	arrays: PickerStateArrays;
	batchSize: number;
	missingItems?: string[];
	extraItems?: string[];
	getState(): {
		eliminated: Array<{ id: string; eliminatedBy: string[] }>;
		survived: string[];
		current: string[];
		evaluating: string[];
		favorites: string[];
		settings: PickerSettings;
	};
	initialize(settings?: PickerSettings): void;
	restoreState(state: PickerStateData): void;
	reset(): void;
	setSettings(settings: PickerSettings): void;
	setFavorites(favorites: string[]): void;
	findByIdentifier(
		identifier: string,
		array: Array<string | { id: string }>,
	): number;
	shouldIncludeItem(identifier: string, settings: PickerSettings): boolean;
	getFilteredItems(): string[];
	findInArray(
		identifier: string,
		arrayName: keyof PickerStateArrays,
	): string | { id: string } | null;
	getBatchSize(currentSize: number): number;
	resetBatchSize(): void;
	validate(): void;
	pick(picked: string[]): void;
	pass(): void;
	removeEliminatedBy(i: number, j: number): void;
	removeFromEliminated(item: string): void;
	addToFavorites(item: string): void;
	nextBatch(): void;
	nextRound(): void;
}

interface PickerItem {
	id: string;
	shortcode?: string;
	[key: string]: unknown;
}

interface PickerOptions {
	items: PickerItem[];
	historyLength?: number;
	favoritesQueryParam?: string;
	defaultSettings?: PickerSettings;
	getBatchSize?: (currentSize: number, settings: PickerSettings) => number;
	shouldIncludeItem?: (item: PickerItem, settings: PickerSettings) => boolean;
	getFilteredItems?: (settings: PickerSettings) => string[];
	modifyState?: (state: PickerStateData) => PickerStateData;
	onLoadState?: (missingItems: string[], extraItems: string[]) => void;
	saveState?: () => void;
	loadState?: () => PickerStateData | null;
	localStorageKey?: string;
	settingsFromFavorites?: (favorites: PickerItem[]) => PickerSettings;
	shortcodeLength?: number;
}

interface PickerStateData {
	eliminated: Array<{ id: string; eliminatedBy: string[] }>;
	survived: string[];
	current: string[];
	evaluating: string[];
	favorites: string[];
	settings?: PickerSettings;
}

interface Picker {
	itemMap: Record<string, PickerItem>;
	options: PickerOptions;
	history: PickerStateData[];
	historyPos: number;
	state: PickerState;
	initialFavorites?: string[];
	getArray(arrayName: keyof PickerStateArrays): PickerItem[];
	getFavorites(): PickerItem[];
	getEvaluating(): PickerItem[];
	getSettings(): PickerSettings;
	getSharedFavorites(): PickerItem[] | null;
	getShortcodeString(): string;
	getShortcodeLink(): string;
	parseShortcodeString(shortcodeString: string): string[];
	pushHistory(): void;
	canUndo(): boolean;
	canRedo(): boolean;
	undo(): void;
	redo(): void;
	resetToFavorites(favorites: string[], useSettings?: PickerSettings): void;
	saveState(): void;
	loadState(): PickerStateData | null;
	isUntouched(): boolean;
	hasItems(): boolean;
	pick(picked: string[]): void;
	pass(): void;
	reset(): void;
	setSettings(settings: PickerSettings): void;
	setFavorites(favorites: string[]): void;
	forEachItem(func: (identifier: string) => unknown): unknown;
	mapItems(identifiers: string[]): PickerItem[];
}

export function PickerState(this: PickerState, options: PickerStateOptions) {
	if (!options.items) {
		console.error("No items specified for PickerState!");
		return;
	}
	this.options = { ...options };
}

/* INITIALIZATION AND SERIALIZATION */

PickerState.prototype.getState = function () {
	/**
	 * Returns a state object corresponding to this PickerState.
	 * We're using deep copies because otherwise the eliminatedBy arrays
	 * may get mutated and undoing/redoing can corrupt the state.
	 */
	return {
		eliminated: copyArray(this.arrays.eliminated),
		survived: copyArray(this.arrays.survived),
		current: copyArray(this.arrays.current),
		evaluating: copyArray(this.arrays.evaluating),
		favorites: copyArray(this.arrays.favorites),
		settings: copyObject(this.settings),
	};
};

PickerState.prototype.initialize = function (settings?: PickerSettings) {
	/**
	 * Initializes the PickerState according to the given settings
	 * (or the default settings if no settings are provided).
	 */
	this.settings = settings || this.options.defaultSettings || {};
	this.items = this.getFilteredItems();

	this.arrays = {
		eliminated: [],
		survived: [],
		current: this.items.slice(0),
		evaluating: [],
		favorites: [],
	};
	this.batchSize = this.getBatchSize(this.arrays.current.length);

	shuffle(this.arrays.current);

	this.nextBatch();
};

PickerState.prototype.restoreState = function (state: PickerStateData) {
	/**
	 * Sets the PickerState to the given dehydrated state.
	 */
	this.settings = {
		...(this.options.defaultSettings || {}),
		...(state.settings || {}),
	};
	this.items = this.getFilteredItems();

	this.arrays = {
		eliminated: [...state.eliminated],
		survived: [...state.survived],
		current: [...state.current],
		evaluating: [...state.evaluating],
		favorites: [...state.favorites],
	};
	this.batchSize = this.arrays.evaluating.length;

	this.validate();
};

PickerState.prototype.reset = function () {
	/**
	 * Resets the PickerState to its initial state (leaving the settings
	 * unchanged).
	 */
	this.initialize(this.settings);
};

/* PUBLIC SETTERS */

PickerState.prototype.setSettings = function (settings: PickerSettings) {
	/**
	 * Sets the settings.
	 */
	this.settings = settings;
	this.items = this.getFilteredItems();

	this.validate();
	this.resetBatchSize();
};

PickerState.prototype.setFavorites = function (favorites: string[]): void {
	/**
	 * Overwrites the found favorites list with the given one.
	 * Since it runs validate, it should be fine if this changes the
	 * actual contents of the list.
	 */
	this.arrays.favorites = [...favorites];
	this.validate();
};

/* STATE UTILITY FUNCTIONS */

PickerState.prototype.findByIdentifier = (
	identifier: string,
	array: Array<string | { id: string }>,
): number => {
	/**
	 * Searches for the given item identifier in the given array and
	 * returns the index at which that identifier is found (or -1 if it is
	 * not found). Handles both plain arrays of identifiers and arrays of
	 * objects with an id property (e.g. the eliminated array).
	 */
	for (let i = 0; i < array.length; i++) {
		if (
			array[i] === identifier ||
			(array[i] as { id: string }).id === identifier
		) {
			return i;
		}
	}
	return -1;
};

PickerState.prototype.shouldIncludeItem = function (
	identifier: string,
	settings: PickerSettings,
): boolean {
	/**
	 * Returns true if this item should be included in the picker
	 * according to the current settings.
	 */
	if (this.options.getFilteredItems) {
		return this.options.getFilteredItems(settings).indexOf(identifier) !== -1;
	}
	if (this.options.shouldIncludeItem) {
		const result = this.options.shouldIncludeItem(identifier, settings);
		return typeof result === "boolean" ? result : false;
	}
	return true;
};

PickerState.prototype.getFilteredItems = function (
	settings: PickerSettings,
): string[] {
	/**
	 * Returns a list of item identifiers that match the given
	 * settings.
	 */
	if (this.options.getFilteredItems) {
		return this.options.getFilteredItems(settings);
	}
	const result: string[] = [];
	for (let i = 0; i < this.options.items.length; i++) {
		if (this.shouldIncludeItem(this.options.items[i], settings)) {
			result.push(this.options.items[i]);
		}
	}
	return result;
};

PickerState.prototype.findInArray = function (
	identifier: string,
	arrayName: keyof PickerStateArrays,
): string | { id: string } | null {
	const index = this.findByIdentifier(identifier, this.arrays[arrayName]);
	if (index !== -1) {
		return this.arrays[arrayName][index];
	}
	return null;
};

PickerState.prototype.getBatchSize = function (currentSize: number): number {
	/**
	 * Returns the number of items that should ideally be displayed at a
	 * time, given the whole round is currentSize items.
	 */
	if (this.options.getBatchSize) {
		return this.options.getBatchSize(currentSize, this.settings);
	}
	return Math.max(
		2,
		this.settings.minBatchSize || 2,
		Math.min(this.settings.maxBatchSize || 20, Math.ceil(currentSize / 5)),
	);
};

PickerState.prototype.resetBatchSize = function () {
	/**
	 * Resets the current batch size to whatever it ought to be given the
	 * size of the current and survived arrays and adjusts the evaluating
	 * array accordingly.
	 */
	Array.prototype.unshift.apply(this.arrays.current, this.arrays.evaluating);
	this.arrays.evaluating = this.arrays.current.splice(
		0,
		this.getBatchSize(this.arrays.current.length + this.arrays.survived.length),
	);
	this.batchSize = this.arrays.evaluating.length;
};

/* STATE VALIDATION */

PickerState.prototype.validate = function () {
	/**
	 * Validates and corrects the state.
	 */
	const expectedItems = this.getFilteredItems();

	const missingItems: string[] = [];
	const extraItems: string[] = [];
	const survived = this.arrays.survived;
	const eliminated = this.arrays.eliminated;
	const evaluating = this.arrays.evaluating;
	const current = this.arrays.current;
	const favorites = this.arrays.favorites;
	const arrays = [favorites, survived, eliminated, current, evaluating];
	let identifier: string;

	const verifyObject: Record<string, boolean> = {};
	let i: number;
	let j: number;

	for (i = 0; i < expectedItems.length; i++) {
		verifyObject[expectedItems[i]] = false;
	}

	// Go through all the items in each array and:
	// - correct errors
	// - mark off the item in the verify object
	// - make sure that each item appears only once by checking if it's
	//   previously been marked off
	// - remove any extra items that shouldn't be there
	// We do this backwards so that we can remove items with splice
	// without messing up the parts of the array we haven't gone through
	// yet.
	for (i = 0; i < arrays.length; i++) {
		for (j = arrays[i].length - 1; j >= 0; j--) {
			identifier = arrays[i][j].id || arrays[i][j];
			if (identifier in verifyObject) {
				// This is one of the items we expect
				if (verifyObject[identifier]) {
					// We've already found this item - it's a copy.
					// Remove it from this array and restore any items
					// eliminated by it, since it might be in error.
					arrays[i].splice(j, 1);
					this.removeFromEliminated(identifier);
				}
				verifyObject[identifier] = true;
			} else {
				// This is an unexpected item - we want to remove it
				arrays[i].splice(j, 1);
				extraItems.push(identifier);
			}
		}
	}
	// Ensure no item is eliminated by itself, fix eliminated items not
	// being properly ntroduced after their eliminator is found, plus
	// removing extraneous items from eliminated lists.
	// We go through both arrays backwards so that splicing the indices
	// won't mess up subsequent indices.
	for (i = eliminated.length - 1; i >= 0; i--) {
		for (j = eliminated[i].eliminatedBy.length - 1; j >= 0; j--) {
			if (eliminated[i].id === eliminated[i].eliminatedBy[j]) {
				this.removeEliminatedBy(i, j);
			}
			if (
				favorites.indexOf(eliminated[i].eliminatedBy[j]) !== -1 ||
				extraItems.indexOf(eliminated[i].eliminatedBy[j]) !== -1
			) {
				this.removeEliminatedBy(i, j);
			}
		}
	}

	// Add in any items that we ought to have but weren't in any of the
	// arrays
	for (identifier in verifyObject) {
		if (verifyObject[identifier] === false) {
			missingItems.push(identifier);
			current.push(identifier);
		}
	}

	// Store the missing items that we've added, if we want to alert the
	// user about them later
	if (missingItems.length > 0) {
		this.missingItems = missingItems;
		// Shuffle current: if we've just added some items, we don't want
		// them all to be dumped at the end of the round
		shuffle(current);
	}

	if (current.length === 0 && evaluating.length === 0 && survived.length > 0) {
		this.nextRound();
		return;
	}

	if (evaluating.length < 2) {
		// Give us an evaluation batch of the size that it should be.
		this.resetBatchSize();
	} else {
		this.batchSize = evaluating.length;
	}
};

/* MAIN PICKER LOGIC */

PickerState.prototype.pick = function (picked: string[]) {
	/**
	 * Picks the given items from the current evaluating batch, moving
	 * them into the survived array and the others into the eliminated
	 * array.
	 */
	let i: number;
	const evaluating = this.arrays.evaluating;
	const survived = this.arrays.survived;
	const eliminated = this.arrays.eliminated;

	// Loop through the items we're currently evaluating
	for (i = 0; i < evaluating.length; i++) {
		if (!picked.length || this.findByIdentifier(evaluating[i], picked) !== -1) {
			// This item is one of the ones we picked - add it to
			// survived
			survived.push(evaluating[i]);
		} else {
			// This item is not one of the ones we picked - add it to
			// eliminated, with the picked items as the eliminators
			eliminated.push({ id: evaluating[i], eliminatedBy: picked.slice(0) });
		}
	}

	this.arrays.evaluating = [];
	this.nextBatch();
};

PickerState.prototype.pass = function () {
	/**
	 * Passes on this batch of items, equivalent to picking every
	 * item.
	 */
	this.pick(this.arrays.evaluating);
};

PickerState.prototype.removeEliminatedBy = function (i: number, j: number) {
	/**
	 * Removes the jth item from the eliminatedBy array of the ith
	 * item in the eliminated array, restoring the item to the
	 * survived array if this leaves the eliminatedBy list empty.
	 *
	 * This modifies the arrays in-place; if executed inside a loop,
	 * the loop must run backwards through both arrays.
	 */
	const eliminated = this.arrays.eliminated;

	eliminated[i].eliminatedBy.splice(j, 1);
	if (eliminated[i].eliminatedBy.length === 0) {
		this.arrays.survived.push(eliminated.splice(i, 1)[0].id);
	}
};

PickerState.prototype.removeFromEliminated = function (item: string) {
	/**
	 * Remove this item from all eliminatedBy lists, restoring any
	 * items left with empty eliminatedBy lists to the survived array.
	 */
	let i: number;
	let idx: number;
	const eliminated = this.arrays.eliminated;

	// Find items that were eliminated by this item.
	for (i = eliminated.length - 1; i >= 0; i--) {
		idx = this.findByIdentifier(item, eliminated[i].eliminatedBy);
		if (idx !== -1) {
			// This item was (partly) eliminated by the given item;
			// remove it
			this.removeEliminatedBy(i, idx);
		}
	}
};

PickerState.prototype.addToFavorites = function (item: string) {
	/**
	 * Add the given item (identifier) to favorites and restore
	 * the items eliminated by it to survived.
	 */
	this.arrays.favorites.push(item);
	this.removeFromEliminated(item);
};

PickerState.prototype.nextBatch = function () {
	/**
	 * Moves on to the next batch of items, adding to favorites if appropriate.
	 */
	const current = this.arrays.current;

	if (current.length < this.batchSize && this.arrays.survived.length > 0) {
		// Start the next round
		this.nextRound();
		return;
	}
	this.arrays.evaluating = current.splice(0, this.batchSize);
};

PickerState.prototype.nextRound = function () {
	/**
	 * Moves on to the next round, shuffling the survived array back into
	 * the current array.
	 */
	// If we've only got one item left in survived, then it's our next
	// favorite - add it to favorites and then start the next round with
	// the new survivors.
	if (this.arrays.current.length === 0 && this.arrays.survived.length === 1) {
		this.addToFavorites(this.arrays.survived.pop());
		this.nextRound();
		return;
	}
	shuffle(this.arrays.survived);
	// Take the survivors and put them at the end of the current array.
	this.arrays.current = this.arrays.current.concat(
		this.arrays.survived.splice(0, this.arrays.survived.length),
	);
	// Pick an appropriate batch size for this new round and then show the next batch.
	this.batchSize = this.getBatchSize(this.arrays.current.length);
	this.nextBatch();
};

/* PICKER OBJECT */

export function Picker(this: Picker, options: PickerOptions) {
	if (!(this instanceof Picker)) {
		return new Picker(options);
	}

	if (!options.items) {
		console.error("No items specified for picker.");
		return;
	}

	this.itemMap = {};
	this.options = {
		historyLength: 3,
		favoritesQueryParam: "favs",
		...options,
	};

	this.history = [];
	this.historyPos = -1;

	// Build the itemMap and catch errors
	for (let i = 0; i < options.items.length; i++) {
		if (options.items[i].id === undefined) {
			console.error(
				"You have an item without an ID! An ID is necessary for the picker's functionality to work.",
				options.items[i],
			);
			return;
		}
		if (
			Object.prototype.hasOwnProperty.call(this.itemMap, options.items[i].id)
		) {
			console.error(
				`You have more than one item with the same ID (${options.items[i].id})! Please ensure the IDs of your items are unique.`,
			);
			return;
		}
		if (
			options.shortcodeLength &&
			(!options.items[i].shortcode ||
				options.items[i].shortcode?.length !== options.shortcodeLength)
		) {
			console.error(
				`You have defined a shortcode length of ${options.shortcodeLength}; however, you have an item with a shortcode that does not match this length (${options.items[i].shortcode}). The shortcode functionality only works if the item shortcodes are of a consistent length.`,
				options.items[i],
			);
			return;
		}
		this.itemMap[options.items[i].id] = options.items[i];
	}

	const defaultSettings = options.defaultSettings || {};

	/* PICKER INITIALIZATION */

	const pickerStateOptions: PickerStateOptions = {
		items: map(options.items, (item) => item.id),
		getBatchSize: options.getBatchSize,
		shouldIncludeItem:
			options.shouldIncludeItem &&
			((identifier: string, settings: PickerSettings) => {
				const result = options.shouldIncludeItem?.(
					this.itemMap[identifier],
					settings,
				);
				return typeof result === "boolean" ? result : false;
			}),
		getFilteredItems: options.getFilteredItems,
		defaultSettings: defaultSettings,
	};

	let savedState = this.loadState();

	// Modify the savedState if we have a modifyState function...
	if (savedState && options.modifyState) {
		savedState = options.modifyState(savedState);
	}
	// ...but if the end result isn't a valid state, throw it away
	if (savedState && !isState(savedState)) {
		console.warn("Ignoring invalid saved state");
		savedState = null;
	}

	this.state = Object.create(PickerState.prototype);
	PickerState.call(this.state, pickerStateOptions);

	if (savedState) {
		this.state.restoreState(savedState);
		if (options.onLoadState) {
			options.onLoadState.call(
				this,
				this.state.missingItems || [],
				this.state.extraItems || [],
			);
		}
		this.pushHistory();
	} else {
		this.state.initialize(defaultSettings);
		this.pushHistory();
	}
}

/* GETTERS */

Picker.prototype.getArray = function (
	arrayName: keyof PickerStateArrays,
): PickerItem[] {
	return this.mapItems(this.state.arrays[arrayName]);
};

Picker.prototype.getFavorites = function (): PickerItem[] {
	return this.getArray("favorites");
};

Picker.prototype.getEvaluating = function (): PickerItem[] {
	return this.getArray("evaluating");
};

Picker.prototype.getSettings = function (): PickerSettings {
	return this.state.settings;
};

Picker.prototype.getSharedFavorites = function (): PickerItem[] | null {
	let query: Record<string, string | boolean>;
	if (
		window.location.search &&
		this.options.favoritesQueryParam &&
		this.options.shortcodeLength
	) {
		query = parseQueryString(window.location.search.substring(1));
		return this.mapItems(
			this.parseShortcodeString(
				String(query[this.options.favoritesQueryParam] || ""),
			) || [],
		);
	}
	return null;
};

/* SHORTCODES */

Picker.prototype.getShortcodeString = function () {
	/**
	 * Gets a shortcode string for the current favorite list.
	 */
	return map(this.getFavorites(), (item) => item.shortcode).join("");
};

Picker.prototype.getShortcodeLink = function () {
	/**
	 * Gets a shortcode link for the current favorite list.
	 */
	return `?${this.options.favoritesQueryParam}=${this.getShortcodeString()}`;
};

Picker.prototype.parseShortcodeString = function (shortcodeString: string) {
	const favorites: string[] = [];
	let i: number;
	let shortcode: string;
	const shortcodeMap: Record<string, string> = {};
	const favoriteMap: Record<string, boolean> = {};

	this.forEachItem((identifier: string) => {
		const item = this.itemMap[identifier];
		if (item.shortcode) {
			shortcodeMap[item.shortcode] = identifier;
		}
	});

	for (
		i = 0;
		i < shortcodeString.length;
		i += this.options.shortcodeLength || 0
	) {
		shortcode = shortcodeString.substring(
			i,
			i + (this.options.shortcodeLength || 0),
		);
		if (shortcode in shortcodeMap) {
			if (!favoriteMap[shortcodeMap[shortcode]]) {
				favorites.push(shortcodeMap[shortcode]);
				favoriteMap[shortcodeMap[shortcode]] = true;
			}
		}
	}
	return favorites;
};

/* HISTORY */

Picker.prototype.pushHistory = function () {
	/**
	 * Adds the current state to the history array.
	 */
	this.history.splice(
		this.historyPos + 1,
		this.history.length,
		this.state.getState(),
	);
	if (this.history.length > this.options.historyLength + 1) {
		this.history.shift();
	}
	this.historyPos = this.history.length - 1;
	this.saveState();
};

Picker.prototype.canUndo = function () {
	/**
	 * Returns true if we can undo.
	 */
	return this.historyPos > 0;
};

Picker.prototype.canRedo = function () {
	/**
	 * Returns true if we can redo.
	 */
	return this.historyPos < this.history.length - 1;
};

Picker.prototype.undo = function () {
	/**
	 * Reverts to the previous state in the history array.
	 */
	if (!this.canUndo()) {
		return;
	}
	this.state.restoreState(this.history[--this.historyPos]);
	this.saveState();
};

Picker.prototype.redo = function () {
	/**
	 * Proceeds to the next state in the history array.
	 */
	if (!this.canRedo()) {
		return;
	}
	this.state.restoreState(this.history[++this.historyPos]);
	this.saveState();
};

Picker.prototype.resetToFavorites = function (
	favorites: string[],
	useSettings?: PickerSettings,
): void {
	const finalFavorites: string[] = [];
	for (let i = 0; i < favorites.length; i++) {
		if (
			!useSettings ||
			this.state.shouldIncludeItem(favorites[i], useSettings)
		) {
			finalFavorites.push(favorites[i]);
		}
	}
	let settingsToUse = useSettings;
	if (!settingsToUse) {
		if (this.options.settingsFromFavorites && this.options.defaultSettings) {
			settingsToUse = copyObject(
				this.options.defaultSettings,
				this.options.settingsFromFavorites(this.mapItems(favorites)),
			);
		} else if (this.options.defaultSettings) {
			settingsToUse = copyObject(this.options.defaultSettings);
		} else {
			settingsToUse = {};
		}
	}
	this.state.initialize(settingsToUse);
	this.state.setFavorites(finalFavorites);
	this.initialFavorites = finalFavorites;
	this.pushHistory();
};

/* STATE */

Picker.prototype.saveState = function () {
	/**
	 * Saves the given state in localStorage, assuming it is available.
	 */
	if (this.options.saveState) {
		this.options.saveState.call(this, this.state.getState());
	} else if (localStorage && JSON && this.options.localStorageKey) {
		localStorage.setItem(
			this.options.localStorageKey,
			JSON.stringify(this.state.getState()),
		);
	}
};

Picker.prototype.loadState = function (): PickerStateData | null {
	let state: PickerStateData | null = null;
	if (this.options.loadState) {
		state = this.options.loadState.call(this);
	} else if (localStorage && JSON && this.options.localStorageKey) {
		try {
			const raw = localStorage.getItem(this.options.localStorageKey);
			state = raw ? JSON.parse(raw) : null;
		} catch (e) {
			return null;
		}
	}
	return state;
};

Picker.prototype.isUntouched = function () {
	/**
	 * Returns true if the state has not been touched (either it's a
	 * completely clean state or one that only has found favorites
	 * matching the state's initial favorites).
	 */
	let i: number;
	const arrays = this.state.arrays;
	const initialFavorites = this.initialFavorites || [];

	// If something is in eliminated/survived, it's not untouched
	if (arrays.eliminated.length > 0 || arrays.survived.length > 0) {
		return false;
	}

	// If we've got nothing in eliminated/survived and nothing in favorites, it is untouched
	if (arrays.favorites.length === 0) {
		return true;
	}

	// We have found favorites, but nothing eliminated/survived: check if the favorites match the initial favorites, if any
	// If it's the wrong number of favorites, it's not untouched
	if (arrays.favorites.length !== initialFavorites.length) {
		return false;
	}
	for (i = 0; i < arrays.favorites.length; i++) {
		if (initialFavorites[i] !== arrays.favorites[i]) {
			// This favorite doesn't match, so it's not untouched
			return false;
		}
	}
	return true;
};

Picker.prototype.hasItems = function () {
	/**
	 * Returns true if the picker has any items (that aren't filtered
	 * out).
	 */
	return this.state.items.length > 0;
};

/* ACTIONS */

Picker.prototype.pick = function (picked: string[]) {
	this.state.pick(picked);
	this.pushHistory();
};

Picker.prototype.pass = function () {
	this.state.pass();
	this.pushHistory();
};

Picker.prototype.reset = function () {
	this.state.reset();
	this.pushHistory();
};

Picker.prototype.setSettings = function (settings) {
	this.state.setSettings(settings);
	this.pushHistory();
};

Picker.prototype.setFavorites = function (favorites) {
	this.state.setFavorites(favorites);
	this.pushHistory();
};

/* PICKER UTILITY FUNCTIONS */

Picker.prototype.forEachItem = function (
	func: (identifier: string) => unknown,
) {
	/**
	 * Executes func for each identifier in the picker's item map.
	 */
	let identifier: string;
	let result: unknown;

	for (identifier in this.itemMap) {
		if (Object.prototype.hasOwnProperty.call(this.itemMap, identifier)) {
			result = func(identifier);
			if (result) {
				return result;
			}
		}
	}
};

Picker.prototype.mapItems = function (identifiers: string[]): PickerItem[] {
	return map(identifiers, (identifier) => {
		const item = this.itemMap[identifier];
		if (typeof item === "object" && item !== null && "id" in item) {
			return item as PickerItem;
		}
		throw new Error("Invalid item in mapItems");
	});
};

/* GENERAL UTILITY FUNCTIONS */

const isState = (state: unknown): boolean =>
	Boolean(
		state &&
			typeof state === "object" &&
			Array.isArray((state as PickerStateData).eliminated) &&
			Array.isArray((state as PickerStateData).survived) &&
			Array.isArray((state as PickerStateData).current) &&
			Array.isArray((state as PickerStateData).evaluating) &&
			Array.isArray((state as PickerStateData).favorites) &&
			(!(state as PickerStateData).settings ||
				typeof (state as PickerStateData).settings === "object"),
	);

function copyArray<T>(array: T[]): T[] {
	const result: T[] = [];
	for (let i = 0; i < array.length; i++) {
		if (array[i] && typeof array[i] === "object") {
			if (Array.isArray(array[i])) {
				result[i] = copyArray(array[i] as unknown[]) as unknown as T;
			} else {
				result[i] = copyObject(
					array[i] as Record<string, unknown>,
				) as unknown as T;
			}
		} else {
			result[i] = array[i];
		}
	}
	return result;
}

function copyObject<T extends Record<string, unknown>>(...args: T[]): T {
	const result = {} as T;
	let a: number;
	let key: string;

	for (a = 0; a < args.length; a++) {
		for (key in args[a]) {
			if (Object.prototype.hasOwnProperty.call(args[a], key)) {
				if (args[a][key] && typeof args[a][key] === "object") {
					if (Array.isArray(args[a][key])) {
						result[key] = copyArray(
							args[a][key] as unknown[],
						) as unknown as T[typeof key];
					} else {
						result[key] = copyObject(
							args[a][key] as Record<string, unknown>,
						) as unknown as T[typeof key];
					}
				} else {
					result[key] = args[a][key] as T[typeof key];
				}
			}
		}
	}
	return result;
}

function map<T, U>(array: T[], func: (item: T) => U): U[] {
	const result: U[] = [];
	for (let i = 0; i < array.length; i++) {
		result[i] = func(array[i]);
	}
	return result;
}

function shuffle<T>(array: T[]): T[] {
	let currentIndex = array.length;
	let temporaryValue: T;
	let randomIndex: number;

	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
}

function parseQueryString(qs: string): Record<string, string | boolean> {
	const query: Record<string, string | boolean> = {};
	const split = qs.split("&");
	let valueSplit: string[];
	let i: number;

	for (i = 0; i < split.length; i++) {
		valueSplit = split[i].split("=");
		query[decodeURIComponent(valueSplit[0])] = valueSplit[1]
			? decodeURIComponent(valueSplit[1])
			: true;
	}
	return query;
}
