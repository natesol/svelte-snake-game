var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        let unsubscribe;
        if (is_crossorigin()) {
            iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            detach(iframe);
            if (unsubscribe)
                unsubscribe();
        };
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const snake = writable({});
    const food = writable({});

    /* src\components\Snake.svelte generated by Svelte v3.22.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i];
    	child_ctx[4] = i;
    	return child_ctx;
    }

    // (16:8) { #if i === 0 }
    function create_if_block(ctx) {
    	let div0;
    	let t;
    	let div1;

    	return {
    		c() {
    			div0 = element("div");
    			t = space();
    			div1 = element("div");
    			attr(div0, "id", "leftEye");
    			attr(div0, "class", "eyes svelte-525s8d");
    			attr(div1, "id", "rightEye");
    			attr(div1, "class", "eyes svelte-525s8d");
    		},
    		m(target, anchor) {
    			insert(target, div0, anchor);
    			insert(target, t, anchor);
    			insert(target, div1, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(div0);
    			if (detaching) detach(t);
    			if (detaching) detach(div1);
    		}
    	};
    }

    // (7:0) { #each $snake.body as bodyPart, i }
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let div_class_value;
    	let if_block = /*i*/ ctx[4] === 0 && create_if_block();

    	return {
    		c() {
    			div = element("div");
    			if (if_block) if_block.c();
    			t = space();
    			attr(div, "class", div_class_value = "snake-body " + (/*i*/ ctx[4] === 0 ? /*$snake*/ ctx[1].direction : "") + " svelte-525s8d");
    			set_style(div, "top", /*bodyPart*/ ctx[2].y * /*cellSize*/ ctx[0] + "px");
    			set_style(div, "left", /*bodyPart*/ ctx[2].x * /*cellSize*/ ctx[0] + "px");
    			set_style(div, "width", /*cellSize*/ ctx[0] - 2 + "px");
    			set_style(div, "height", /*cellSize*/ ctx[0] - 2 + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*$snake*/ 2 && div_class_value !== (div_class_value = "snake-body " + (/*i*/ ctx[4] === 0 ? /*$snake*/ ctx[1].direction : "") + " svelte-525s8d")) {
    				attr(div, "class", div_class_value);
    			}

    			if (dirty & /*$snake, cellSize*/ 3) {
    				set_style(div, "top", /*bodyPart*/ ctx[2].y * /*cellSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*$snake, cellSize*/ 3) {
    				set_style(div, "left", /*bodyPart*/ ctx[2].x * /*cellSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*cellSize*/ 1) {
    				set_style(div, "width", /*cellSize*/ ctx[0] - 2 + "px");
    			}

    			if (dirty & /*cellSize*/ 1) {
    				set_style(div, "height", /*cellSize*/ ctx[0] - 2 + "px");
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block) if_block.d();
    		}
    	};
    }

    function create_fragment(ctx) {
    	let each_1_anchor;
    	let each_value = /*$snake*/ ctx[1].body;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, each_1_anchor, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$snake, cellSize*/ 3) {
    				each_value = /*$snake*/ ctx[1].body;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach(each_1_anchor);
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let $snake;
    	component_subscribe($$self, snake, $$value => $$invalidate(1, $snake = $$value));
    	let { cellSize } = $$props;

    	$$self.$set = $$props => {
    		if ("cellSize" in $$props) $$invalidate(0, cellSize = $$props.cellSize);
    	};

    	return [cellSize, $snake];
    }

    class Snake extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, { cellSize: 0 });
    	}
    }

    /* src\components\Food.svelte generated by Svelte v3.22.2 */

    function create_fragment$1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "food svelte-1sg84l3");
    			set_style(div, "top", /*$food*/ ctx[1].y * /*cellSize*/ ctx[0] + "px");
    			set_style(div, "left", /*$food*/ ctx[1].x * /*cellSize*/ ctx[0] + "px");
    			set_style(div, "width", /*cellSize*/ ctx[0] - 2 + "px");
    			set_style(div, "height", /*cellSize*/ ctx[0] - 2 + "px");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$food, cellSize*/ 3) {
    				set_style(div, "top", /*$food*/ ctx[1].y * /*cellSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*$food, cellSize*/ 3) {
    				set_style(div, "left", /*$food*/ ctx[1].x * /*cellSize*/ ctx[0] + "px");
    			}

    			if (dirty & /*cellSize*/ 1) {
    				set_style(div, "width", /*cellSize*/ ctx[0] - 2 + "px");
    			}

    			if (dirty & /*cellSize*/ 1) {
    				set_style(div, "height", /*cellSize*/ ctx[0] - 2 + "px");
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $food;
    	component_subscribe($$self, food, $$value => $$invalidate(1, $food = $$value));
    	let { cellSize } = $$props;

    	$$self.$set = $$props => {
    		if ("cellSize" in $$props) $$invalidate(0, cellSize = $$props.cellSize);
    	};

    	return [cellSize, $food];
    }

    class Food extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { cellSize: 0 });
    	}
    }

    /* src\components\Board.svelte generated by Svelte v3.22.2 */

    function create_fragment$2(ctx) {
    	let div;
    	let t;
    	let current;
    	const snake = new Snake({ props: { cellSize: /*cellSize*/ ctx[2] } });
    	const food = new Food({ props: { cellSize: /*cellSize*/ ctx[2] } });

    	return {
    		c() {
    			div = element("div");
    			create_component(snake.$$.fragment);
    			t = space();
    			create_component(food.$$.fragment);
    			attr(div, "class", "board svelte-1awx1c");
    			set_style(div, "width", /*width*/ ctx[0] * /*cellSize*/ ctx[2] + "px");
    			set_style(div, "height", /*height*/ ctx[1] * /*cellSize*/ ctx[2] + "px\r\n    ");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(snake, div, null);
    			append(div, t);
    			mount_component(food, div, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const snake_changes = {};
    			if (dirty & /*cellSize*/ 4) snake_changes.cellSize = /*cellSize*/ ctx[2];
    			snake.$set(snake_changes);
    			const food_changes = {};
    			if (dirty & /*cellSize*/ 4) food_changes.cellSize = /*cellSize*/ ctx[2];
    			food.$set(food_changes);

    			if (!current || dirty & /*width, cellSize*/ 5) {
    				set_style(div, "width", /*width*/ ctx[0] * /*cellSize*/ ctx[2] + "px");
    			}

    			if (!current || dirty & /*height, cellSize*/ 6) {
    				set_style(div, "height", /*height*/ ctx[1] * /*cellSize*/ ctx[2] + "px\r\n    ");
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(snake.$$.fragment, local);
    			transition_in(food.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(snake.$$.fragment, local);
    			transition_out(food.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(snake);
    			destroy_component(food);
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { width } = $$props;
    	let { height } = $$props;
    	let { cellSize } = $$props;

    	$$self.$set = $$props => {
    		if ("width" in $$props) $$invalidate(0, width = $$props.width);
    		if ("height" in $$props) $$invalidate(1, height = $$props.height);
    		if ("cellSize" in $$props) $$invalidate(2, cellSize = $$props.cellSize);
    	};

    	return [width, height, cellSize];
    }

    class Board extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { width: 0, height: 1, cellSize: 2 });
    	}
    }

    /* src\components\Game.svelte generated by Svelte v3.22.2 */

    const { window: window_1 } = globals;

    function create_fragment$3(ctx) {
    	let div;
    	let t0;
    	let h2;
    	let t1;
    	let t2;
    	let div_resize_listener;
    	let current;
    	let dispose;

    	const board = new Board({
    			props: {
    				width: BOARD_WIDTH,
    				height: BOARD_HEGHIT,
    				cellSize: BOARD_CELL_SIZE
    			}
    		});

    	return {
    		c() {
    			div = element("div");
    			create_component(board.$$.fragment);
    			t0 = space();
    			h2 = element("h2");
    			t1 = text("Score ");
    			t2 = text(/*score*/ ctx[1]);
    			attr(h2, "class", "svelte-wbk7i4");
    			add_render_callback(() => /*div_elementresize_handler*/ ctx[19].call(div));
    		},
    		m(target, anchor, remount) {
    			insert(target, div, anchor);
    			mount_component(board, div, null);
    			append(div, t0);
    			append(div, h2);
    			append(h2, t1);
    			append(h2, t2);
    			div_resize_listener = add_resize_listener(div, /*div_elementresize_handler*/ ctx[19].bind(div));
    			current = true;
    			if (remount) dispose();
    			dispose = listen(window_1, "keydown", /*keyDownHandler*/ ctx[2]);
    		},
    		p(ctx, [dirty]) {
    			if (!current || dirty & /*score*/ 2) set_data(t2, /*score*/ ctx[1]);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(board.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(board.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_component(board);
    			div_resize_listener();
    			dispose();
    		}
    	};
    }

    const BOARD_WIDTH = 30;
    const BOARD_HEGHIT = 22;
    const BOARD_CELL_SIZE = 30;
    const BOARD_KEY_EMPTY_CELL = 0;
    const BOARD_KEY_SNAKE_BODY = 1;
    const BOARD_KEY_FOOD = 2;
    const LEFT = "left";
    const UP = "up";
    const RIGHT = "right";
    const DOWN = "down";
    const SNAKE_START_SPEED = 300;
    const SNAKE_START_LENGTH = 3;

    function instance$3($$self, $$props, $$invalidate) {
    	let $food;
    	let $snake;
    	component_subscribe($$self, food, $$value => $$invalidate(4, $food = $$value));
    	component_subscribe($$self, snake, $$value => $$invalidate(5, $snake = $$value));
    	let boardWidth;
    	const viewPortWidth = window.innerWidth;
    	const viewPortHeight = window.innerHeight;
    	console.log(boardWidth);
    	console.log(viewPortWidth);
    	console.log(viewPortHeight);
    	const BOARD = Array.from({ length: BOARD_HEGHIT }, () => Array.from({ length: BOARD_WIDTH }, () => BOARD_KEY_EMPTY_CELL));
    	const SNAKE_START_DIR = RIGHT;

    	// Board
    	const updateBoard = (updateSnake = false, updateFood = false) => {
    		if (updateFood) {
    			BOARD.forEach(row => {
    				row.forEach(cell => {
    				});
    			});

    			BOARD[$food.y][$food.x] = BOARD_KEY_FOOD;
    		}

    		if (updateSnake) {
    			BOARD.forEach(row => {
    				row.forEach(cell => {
    				});
    			});

    			$snake.body.forEach(snakePart => {
    				BOARD[snakePart.y][snakePart.x] = BOARD_KEY_SNAKE_BODY;
    			});
    		}
    	};

    	const getBoardEmptyCells = () => {
    		const cellsList = [];

    		for (let i = 0; i < BOARD.length; i++) {
    			for (let j = 0; j < BOARD[i].length; j++) {
    				if (BOARD[i][j] === BOARD_KEY_EMPTY_CELL) cellsList.push({ x: j, y: i });
    			}
    		}

    		return cellsList;
    	};

    	// Snake
    	const createSnake = (speed, direction, length) => {
    		const createSnakeBody = () => {
    			const body = [];

    			for (let i = 1; i <= length; i++) {
    				body.push({ x: length - i, y: 0 });
    			}

    			return body;
    		};

    		return {
    			speed,
    			direction,
    			body: createSnakeBody()
    		};
    	};

    	const moveSnake = () => {
    		const tail = $snake.body.pop();
    		BOARD[tail.y][tail.x] = BOARD_KEY_EMPTY_CELL;
    		let { x, y } = $snake.body[0];

    		switch ($snake.direction) {
    			case LEFT:
    				x -= 1;
    				break;
    			case UP:
    				y -= 1;
    				break;
    			case RIGHT:
    				x += 1;
    				break;
    			case DOWN:
    				y += 1;
    				break;
    		}

    		set_store_value(snake, $snake.body = [{ x, y }, ...$snake.body], $snake);
    		BOARD[y][x] = BOARD_KEY_SNAKE_BODY;
    	};

    	// Food
    	const getRandomEmptyLocation = () => {
    		const emptyCells = getBoardEmptyCells();
    		const random = Math.floor(Math.random() * (emptyCells.length + 1));

    		return {
    			x: emptyCells[random].x,
    			y: emptyCells[random].y
    		};
    	};

    	// Game Logic
    	const resetGame = () => {
    		set_store_value(snake, $snake = createSnake(SNAKE_START_SPEED, SNAKE_START_DIR, SNAKE_START_LENGTH));
    		updateBoard(true);
    		set_store_value(food, $food = getRandomEmptyLocation());
    		updateBoard(false, true);
    	};

    	const getDirectionFromKeyCode = keyCode => {
    		switch (keyCode) {
    			case 37:
    				return LEFT;
    			case 38:
    				return UP;
    			case 39:
    				return RIGHT;
    			case 40:
    				return DOWN;
    			default:
    				return null;
    		}
    	};

    	const isDirectionLegal = (newDir, oldDir) => {
    		return !(newDir === LEFT && oldDir === RIGHT || newDir === RIGHT && oldDir === LEFT || newDir === UP && oldDir === DOWN || newDir === DOWN && oldDir === UP);
    	};

    	const keyDownHandler = e => {
    		const newDirection = getDirectionFromKeyCode(e.keyCode);

    		if (newDirection && isDirectionLegal(newDirection, $snake.direction)) {
    			set_store_value(snake, $snake.direction = newDirection, $snake);
    		}
    	};

    	const isGameOver = () => {
    		const snakeHead = $snake.body[0];
    		return snakeHead.x < 0 || snakeHead.x > BOARD_WIDTH - 1 || snakeHead.y < 0 || snakeHead.y > BOARD_HEGHIT - 1 || $snake.body.every(part => snakeHead.x !== part.x && snakeHead.y !== part.y);
    	};

    	const startGame = () => {
    		const gameLoop = () => {
    			moveSnake();
    			const head = $snake.body[0];

    			if (head.x === $food.x && head.y === $food.y) {
    				set_store_value(food, $food = getRandomEmptyLocation());
    				updateBoard(false, true);
    				set_store_value(snake, $snake.body = [...$snake.body, $snake.body[$snake.body.length - 1]], $snake);
    				set_store_value(snake, $snake.speed = $snake.speed * 0.95, $snake);
    			}

    			if (isGameOver()) {
    				resetGame();
    			}

    			setTimeout(gameLoop, $snake.speed);
    		};

    		gameLoop();
    	};

    	// 
    	resetGame();

    	startGame();

    	function div_elementresize_handler() {
    		boardWidth = this.clientWidth;
    		$$invalidate(0, boardWidth);
    	}

    	let score;

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$snake*/ 32) {
    			 $$invalidate(1, score = $snake.body.length - SNAKE_START_LENGTH);
    		}
    	};

    	return [
    		boardWidth,
    		score,
    		keyDownHandler,
    		BOARD,
    		$food,
    		$snake,
    		viewPortWidth,
    		viewPortHeight,
    		SNAKE_START_DIR,
    		updateBoard,
    		getBoardEmptyCells,
    		createSnake,
    		moveSnake,
    		getRandomEmptyLocation,
    		resetGame,
    		getDirectionFromKeyCode,
    		isDirectionLegal,
    		isGameOver,
    		startGame,
    		div_elementresize_handler
    	];
    }

    class Game extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});
    	}
    }

    /* src\components\Controls.svelte generated by Svelte v3.22.2 */

    function create_fragment$4(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let t0;
    	let div1;
    	let button1;
    	let t1;
    	let button2;
    	let t2;
    	let button3;
    	let dispose;

    	return {
    		c() {
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			button0.innerHTML = `<i class="fas fa-arrow-up"></i>`;
    			t0 = space();
    			div1 = element("div");
    			button1 = element("button");
    			button1.innerHTML = `<i class="fas fa-arrow-left"></i>`;
    			t1 = space();
    			button2 = element("button");
    			button2.innerHTML = `<i class="fas fa-arrow-down"></i>`;
    			t2 = space();
    			button3 = element("button");
    			button3.innerHTML = `<i class="fas fa-arrow-right"></i>`;
    			attr(button0, "class", "svelte-z0d9zw");
    			attr(button1, "class", "svelte-z0d9zw");
    			attr(button2, "class", "svelte-z0d9zw");
    			attr(button3, "class", "svelte-z0d9zw");
    			attr(div2, "class", "controls svelte-z0d9zw");
    		},
    		m(target, anchor, remount) {
    			insert(target, div2, anchor);
    			append(div2, div0);
    			append(div0, button0);
    			append(div2, t0);
    			append(div2, div1);
    			append(div1, button1);
    			append(div1, t1);
    			append(div1, button2);
    			append(div1, t2);
    			append(div1, button3);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen(button0, "click", /*upClick*/ ctx[1]),
    				listen(button1, "click", /*leftClick*/ ctx[0]),
    				listen(button2, "click", /*downClick*/ ctx[3]),
    				listen(button3, "click", /*rightClick*/ ctx[2])
    			];
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div2);
    			run_all(dispose);
    		}
    	};
    }

    function instance$4($$self) {
    	const leftClick = () => {
    		dispatchEvent(new KeyboardEvent("keydown",
    		{
    				key: "ArrowLeft",
    				keyCode: 37,
    				code: "ArrowLeft",
    				which: 37,
    				shiftKey: false,
    				ctrlKey: false,
    				metaKey: false
    			}));
    	};

    	const upClick = () => {
    		dispatchEvent(new KeyboardEvent("keydown",
    		{
    				key: "ArrowUp",
    				keyCode: 38,
    				code: "ArrowUp",
    				which: 38,
    				shiftKey: false,
    				ctrlKey: false,
    				metaKey: false
    			}));
    	};

    	const rightClick = () => {
    		dispatchEvent(new KeyboardEvent("keydown",
    		{
    				key: "ArrowRight",
    				keyCode: 39,
    				code: "ArrowRight",
    				which: 39,
    				shiftKey: false,
    				ctrlKey: false,
    				metaKey: false
    			}));
    	};

    	const downClick = () => {
    		dispatchEvent(new KeyboardEvent("keydown",
    		{
    				key: "ArrowDown",
    				keyCode: 40,
    				code: "ArrowDown",
    				which: 40,
    				shiftKey: false,
    				ctrlKey: false,
    				metaKey: false
    			}));
    	};

    	return [leftClick, upClick, rightClick, downClick];
    }

    class Controls extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});
    	}
    }

    /* src\components\App.svelte generated by Svelte v3.22.2 */

    function create_fragment$5(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let t2;
    	let current;
    	const game = new Game({});
    	const controls = new Controls({});

    	return {
    		c() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Snake Game";
    			t1 = space();
    			create_component(game.$$.fragment);
    			t2 = space();
    			create_component(controls.$$.fragment);
    			attr(h1, "class", "svelte-4gg76p");
    			attr(main, "class", "svelte-4gg76p");
    		},
    		m(target, anchor) {
    			insert(target, main, anchor);
    			append(main, h1);
    			append(main, t1);
    			mount_component(game, main, null);
    			append(main, t2);
    			mount_component(controls, main, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(game.$$.fragment, local);
    			transition_in(controls.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(game.$$.fragment, local);
    			transition_out(controls.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(main);
    			destroy_component(game);
    			destroy_component(controls);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$5, safe_not_equal, {});
    	}
    }

    const app = new App({
        target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
