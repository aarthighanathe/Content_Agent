import { createRequire as __ssrCreateRequire } from 'node:module';
const require = __ssrCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/react/cjs/react.production.js
var require_react_production = __commonJS({
  "node_modules/react/cjs/react.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
    var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
    var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
    var REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var ReactNoopUpdateQueue = {
      isMounted: function() {
        return false;
      },
      enqueueForceUpdate: function() {
      },
      enqueueReplaceState: function() {
      },
      enqueueSetState: function() {
      }
    };
    var assign = Object.assign;
    var emptyObject = {};
    function Component(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    Component.prototype.isReactComponent = {};
    Component.prototype.setState = function(partialState, callback) {
      if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState)
        throw Error(
          "takes an object of state variables to update or a function which returns an object of state variables."
        );
      this.updater.enqueueSetState(this, partialState, callback, "setState");
    };
    Component.prototype.forceUpdate = function(callback) {
      this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
    };
    function ComponentDummy() {
    }
    ComponentDummy.prototype = Component.prototype;
    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context;
      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }
    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent;
    assign(pureComponentPrototype, Component.prototype);
    pureComponentPrototype.isPureReactComponent = true;
    var isArrayImpl = Array.isArray;
    function noop() {
    }
    var ReactSharedInternals = { H: null, A: null, T: null, S: null };
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function ReactElement(type, key, props) {
      var refProp = props.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== refProp ? refProp : null,
        props
      };
    }
    function cloneAndReplaceKey(oldElement, newKey) {
      return ReactElement(oldElement.type, newKey, oldElement.props);
    }
    function isValidElement(object) {
      return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
    }
    function escape(key) {
      var escaperLookup = { "=": "=0", ":": "=2" };
      return "$" + key.replace(/[=:]/g, function(match) {
        return escaperLookup[match];
      });
    }
    var userProvidedKeyEscapeRegex = /\/+/g;
    function getElementKey(element, index) {
      return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
    }
    function resolveThenable(thenable) {
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(
            function(fulfilledValue) {
              "pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
            },
            function(error) {
              "pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
            }
          )), thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
      }
      throw thenable;
    }
    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;
      if ("undefined" === type || "boolean" === type) children = null;
      var invokeCallback = false;
      if (null === children) invokeCallback = true;
      else
        switch (type) {
          case "bigint":
          case "string":
          case "number":
            invokeCallback = true;
            break;
          case "object":
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
                break;
              case REACT_LAZY_TYPE:
                return invokeCallback = children._init, mapIntoArray(
                  invokeCallback(children._payload),
                  array,
                  escapedPrefix,
                  nameSoFar,
                  callback
                );
            }
        }
      if (invokeCallback)
        return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
          return c;
        })) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(
          callback,
          escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(
            userProvidedKeyEscapeRegex,
            "$&/"
          ) + "/") + invokeCallback
        )), array.push(callback)), 1;
      invokeCallback = 0;
      var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
      if (isArrayImpl(children))
        for (var i = 0; i < children.length; i++)
          nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if (i = getIteratorFn(children), "function" === typeof i)
        for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done; )
          nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(
            nameSoFar,
            array,
            escapedPrefix,
            type,
            callback
          );
      else if ("object" === type) {
        if ("function" === typeof children.then)
          return mapIntoArray(
            resolveThenable(children),
            array,
            escapedPrefix,
            nameSoFar,
            callback
          );
        array = String(children);
        throw Error(
          "Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead."
        );
      }
      return invokeCallback;
    }
    function mapChildren(children, func, context) {
      if (null == children) return children;
      var result = [], count = 0;
      mapIntoArray(children, result, "", "", function(child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    function lazyInitializer(payload) {
      if (-1 === payload._status) {
        var ctor = payload._result;
        ctor = ctor();
        ctor.then(
          function(moduleObject) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 1, payload._result = moduleObject;
          },
          function(error) {
            if (0 === payload._status || -1 === payload._status)
              payload._status = 2, payload._result = error;
          }
        );
        -1 === payload._status && (payload._status = 0, payload._result = ctor);
      }
      if (1 === payload._status) return payload._result.default;
      throw payload._result;
    }
    var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
      if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
        var event = new window.ErrorEvent("error", {
          bubbles: true,
          cancelable: true,
          message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
          error
        });
        if (!window.dispatchEvent(event)) return;
      } else if ("object" === typeof process && "function" === typeof process.emit) {
        process.emit("uncaughtException", error);
        return;
      }
      console.error(error);
    };
    var Children = {
      map: mapChildren,
      forEach: function(children, forEachFunc, forEachContext) {
        mapChildren(
          children,
          function() {
            forEachFunc.apply(this, arguments);
          },
          forEachContext
        );
      },
      count: function(children) {
        var n = 0;
        mapChildren(children, function() {
          n++;
        });
        return n;
      },
      toArray: function(children) {
        return mapChildren(children, function(child) {
          return child;
        }) || [];
      },
      only: function(children) {
        if (!isValidElement(children))
          throw Error(
            "React.Children.only expected to receive a single React element child."
          );
        return children;
      }
    };
    exports.Activity = REACT_ACTIVITY_TYPE;
    exports.Children = Children;
    exports.Component = Component;
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.Profiler = REACT_PROFILER_TYPE;
    exports.PureComponent = PureComponent;
    exports.StrictMode = REACT_STRICT_MODE_TYPE;
    exports.Suspense = REACT_SUSPENSE_TYPE;
    exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
    exports.__COMPILER_RUNTIME = {
      __proto__: null,
      c: function(size) {
        return ReactSharedInternals.H.useMemoCache(size);
      }
    };
    exports.cache = function(fn) {
      return function() {
        return fn.apply(null, arguments);
      };
    };
    exports.cacheSignal = function() {
      return null;
    };
    exports.cloneElement = function(element, config, children) {
      if (null === element || void 0 === element)
        throw Error(
          "The argument must be a React element, but you passed " + element + "."
        );
      var props = assign({}, element.props), key = element.key;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
      var propName = arguments.length - 2;
      if (1 === propName) props.children = children;
      else if (1 < propName) {
        for (var childArray = Array(propName), i = 0; i < propName; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      return ReactElement(element.type, key, props);
    };
    exports.createContext = function(defaultValue) {
      defaultValue = {
        $$typeof: REACT_CONTEXT_TYPE,
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        _threadCount: 0,
        Provider: null,
        Consumer: null
      };
      defaultValue.Provider = defaultValue;
      defaultValue.Consumer = {
        $$typeof: REACT_CONSUMER_TYPE,
        _context: defaultValue
      };
      return defaultValue;
    };
    exports.createElement = function(type, config, children) {
      var propName, props = {}, key = null;
      if (null != config)
        for (propName in void 0 !== config.key && (key = "" + config.key), config)
          hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
      var childrenLength = arguments.length - 2;
      if (1 === childrenLength) props.children = children;
      else if (1 < childrenLength) {
        for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++)
          childArray[i] = arguments[i + 2];
        props.children = childArray;
      }
      if (type && type.defaultProps)
        for (propName in childrenLength = type.defaultProps, childrenLength)
          void 0 === props[propName] && (props[propName] = childrenLength[propName]);
      return ReactElement(type, key, props);
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(render) {
      return { $$typeof: REACT_FORWARD_REF_TYPE, render };
    };
    exports.isValidElement = isValidElement;
    exports.lazy = function(ctor) {
      return {
        $$typeof: REACT_LAZY_TYPE,
        _payload: { _status: -1, _result: ctor },
        _init: lazyInitializer
      };
    };
    exports.memo = function(type, compare) {
      return {
        $$typeof: REACT_MEMO_TYPE,
        type,
        compare: void 0 === compare ? null : compare
      };
    };
    exports.startTransition = function(scope) {
      var prevTransition = ReactSharedInternals.T, currentTransition = {};
      ReactSharedInternals.T = currentTransition;
      try {
        var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
        null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
        "object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
      } catch (error) {
        reportGlobalError(error);
      } finally {
        null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
      }
    };
    exports.unstable_useCacheRefresh = function() {
      return ReactSharedInternals.H.useCacheRefresh();
    };
    exports.use = function(usable) {
      return ReactSharedInternals.H.use(usable);
    };
    exports.useActionState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useActionState(action, initialState, permalink);
    };
    exports.useCallback = function(callback, deps) {
      return ReactSharedInternals.H.useCallback(callback, deps);
    };
    exports.useContext = function(Context) {
      return ReactSharedInternals.H.useContext(Context);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(value, initialValue) {
      return ReactSharedInternals.H.useDeferredValue(value, initialValue);
    };
    exports.useEffect = function(create, deps) {
      return ReactSharedInternals.H.useEffect(create, deps);
    };
    exports.useEffectEvent = function(callback) {
      return ReactSharedInternals.H.useEffectEvent(callback);
    };
    exports.useId = function() {
      return ReactSharedInternals.H.useId();
    };
    exports.useImperativeHandle = function(ref, create, deps) {
      return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
    };
    exports.useInsertionEffect = function(create, deps) {
      return ReactSharedInternals.H.useInsertionEffect(create, deps);
    };
    exports.useLayoutEffect = function(create, deps) {
      return ReactSharedInternals.H.useLayoutEffect(create, deps);
    };
    exports.useMemo = function(create, deps) {
      return ReactSharedInternals.H.useMemo(create, deps);
    };
    exports.useOptimistic = function(passthrough, reducer) {
      return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
    };
    exports.useReducer = function(reducer, initialArg, init) {
      return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
    };
    exports.useRef = function(initialValue) {
      return ReactSharedInternals.H.useRef(initialValue);
    };
    exports.useState = function(initialState) {
      return ReactSharedInternals.H.useState(initialState);
    };
    exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
      return ReactSharedInternals.H.useSyncExternalStore(
        subscribe,
        getSnapshot,
        getServerSnapshot
      );
    };
    exports.useTransition = function() {
      return ReactSharedInternals.H.useTransition();
    };
    exports.version = "19.2.8";
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports, module) {
    "use strict";
    if (true) {
      module.exports = require_react_production();
    } else {
      module.exports = null;
    }
  }
});

// node_modules/react-dom/cjs/react-dom.production.js
var require_react_dom_production = __commonJS({
  "node_modules/react-dom/cjs/react-dom.production.js"(exports) {
    "use strict";
    var React2 = require_react();
    function formatProdErrorMessage(code) {
      var url = "https://react.dev/errors/" + code;
      if (1 < arguments.length) {
        url += "?args[]=" + encodeURIComponent(arguments[1]);
        for (var i = 2; i < arguments.length; i++)
          url += "&args[]=" + encodeURIComponent(arguments[i]);
      }
      return "Minified React error #" + code + "; visit " + url + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
    }
    function noop() {
    }
    var Internals = {
      d: {
        f: noop,
        r: function() {
          throw Error(formatProdErrorMessage(522));
        },
        D: noop,
        C: noop,
        L: noop,
        m: noop,
        X: noop,
        S: noop,
        M: noop
      },
      p: 0,
      findDOMNode: null
    };
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    function createPortal$1(children, containerInfo, implementation) {
      var key = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
      return {
        $$typeof: REACT_PORTAL_TYPE,
        key: null == key ? null : "" + key,
        children,
        containerInfo,
        implementation
      };
    }
    var ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    function getCrossOriginStringAs(as, input) {
      if ("font" === as) return "";
      if ("string" === typeof input)
        return "use-credentials" === input ? input : "";
    }
    exports.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = Internals;
    exports.createPortal = function(children, container) {
      var key = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
      if (!container || 1 !== container.nodeType && 9 !== container.nodeType && 11 !== container.nodeType)
        throw Error(formatProdErrorMessage(299));
      return createPortal$1(children, container, null, key);
    };
    exports.flushSync = function(fn) {
      var previousTransition = ReactSharedInternals.T, previousUpdatePriority = Internals.p;
      try {
        if (ReactSharedInternals.T = null, Internals.p = 2, fn) return fn();
      } finally {
        ReactSharedInternals.T = previousTransition, Internals.p = previousUpdatePriority, Internals.d.f();
      }
    };
    exports.preconnect = function(href, options) {
      "string" === typeof href && (options ? (options = options.crossOrigin, options = "string" === typeof options ? "use-credentials" === options ? options : "" : void 0) : options = null, Internals.d.C(href, options));
    };
    exports.prefetchDNS = function(href) {
      "string" === typeof href && Internals.d.D(href);
    };
    exports.preinit = function(href, options) {
      if ("string" === typeof href && options && "string" === typeof options.as) {
        var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin), integrity = "string" === typeof options.integrity ? options.integrity : void 0, fetchPriority = "string" === typeof options.fetchPriority ? options.fetchPriority : void 0;
        "style" === as ? Internals.d.S(
          href,
          "string" === typeof options.precedence ? options.precedence : void 0,
          {
            crossOrigin,
            integrity,
            fetchPriority
          }
        ) : "script" === as && Internals.d.X(href, {
          crossOrigin,
          integrity,
          fetchPriority,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0
        });
      }
    };
    exports.preinitModule = function(href, options) {
      if ("string" === typeof href)
        if ("object" === typeof options && null !== options) {
          if (null == options.as || "script" === options.as) {
            var crossOrigin = getCrossOriginStringAs(
              options.as,
              options.crossOrigin
            );
            Internals.d.M(href, {
              crossOrigin,
              integrity: "string" === typeof options.integrity ? options.integrity : void 0,
              nonce: "string" === typeof options.nonce ? options.nonce : void 0
            });
          }
        } else null == options && Internals.d.M(href);
    };
    exports.preload = function(href, options) {
      if ("string" === typeof href && "object" === typeof options && null !== options && "string" === typeof options.as) {
        var as = options.as, crossOrigin = getCrossOriginStringAs(as, options.crossOrigin);
        Internals.d.L(href, as, {
          crossOrigin,
          integrity: "string" === typeof options.integrity ? options.integrity : void 0,
          nonce: "string" === typeof options.nonce ? options.nonce : void 0,
          type: "string" === typeof options.type ? options.type : void 0,
          fetchPriority: "string" === typeof options.fetchPriority ? options.fetchPriority : void 0,
          referrerPolicy: "string" === typeof options.referrerPolicy ? options.referrerPolicy : void 0,
          imageSrcSet: "string" === typeof options.imageSrcSet ? options.imageSrcSet : void 0,
          imageSizes: "string" === typeof options.imageSizes ? options.imageSizes : void 0,
          media: "string" === typeof options.media ? options.media : void 0
        });
      }
    };
    exports.preloadModule = function(href, options) {
      if ("string" === typeof href)
        if (options) {
          var crossOrigin = getCrossOriginStringAs(options.as, options.crossOrigin);
          Internals.d.m(href, {
            as: "string" === typeof options.as && "script" !== options.as ? options.as : void 0,
            crossOrigin,
            integrity: "string" === typeof options.integrity ? options.integrity : void 0
          });
        } else Internals.d.m(href);
    };
    exports.requestFormReset = function(form) {
      Internals.d.r(form);
    };
    exports.unstable_batchedUpdates = function(fn, a) {
      return fn(a);
    };
    exports.useFormState = function(action, initialState, permalink) {
      return ReactSharedInternals.H.useFormState(action, initialState, permalink);
    };
    exports.useFormStatus = function() {
      return ReactSharedInternals.H.useHostTransitionStatus();
    };
    exports.version = "19.2.8";
  }
});

// node_modules/react-dom/index.js
var require_react_dom = __commonJS({
  "node_modules/react-dom/index.js"(exports, module) {
    "use strict";
    function checkDCE() {
      if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
        return;
      }
      if (false) {
        throw new Error("^_^");
      }
      try {
        __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
      } catch (err) {
        console.error(err);
      }
    }
    if (true) {
      checkDCE();
      module.exports = require_react_dom_production();
    } else {
      module.exports = null;
    }
  }
});

// node_modules/react-dom/cjs/react-dom-server-legacy.node.production.js
var require_react_dom_server_legacy_node_production = __commonJS({
  "node_modules/react-dom/cjs/react-dom-server-legacy.node.production.js"(exports) {
    "use strict";
    var React2 = require_react();
    var ReactDOM = require_react_dom();
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
    var REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list");
    var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
    var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
    var REACT_SCOPE_TYPE = /* @__PURE__ */ Symbol.for("react.scope");
    var REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity");
    var REACT_LEGACY_HIDDEN_TYPE = /* @__PURE__ */ Symbol.for("react.legacy_hidden");
    var REACT_MEMO_CACHE_SENTINEL = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel");
    var REACT_VIEW_TRANSITION_TYPE = /* @__PURE__ */ Symbol.for("react.view_transition");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var isArrayImpl = Array.isArray;
    function murmurhash3_32_gc(key, seed) {
      var remainder = key.length & 3;
      var bytes = key.length - remainder;
      var h1 = seed;
      for (seed = 0; seed < bytes; ) {
        var k1 = key.charCodeAt(seed) & 255 | (key.charCodeAt(++seed) & 255) << 8 | (key.charCodeAt(++seed) & 255) << 16 | (key.charCodeAt(++seed) & 255) << 24;
        ++seed;
        k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295;
        k1 = k1 << 15 | k1 >>> 17;
        k1 = 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
        h1 ^= k1;
        h1 = h1 << 13 | h1 >>> 19;
        h1 = 5 * (h1 & 65535) + ((5 * (h1 >>> 16) & 65535) << 16) & 4294967295;
        h1 = (h1 & 65535) + 27492 + (((h1 >>> 16) + 58964 & 65535) << 16);
      }
      k1 = 0;
      switch (remainder) {
        case 3:
          k1 ^= (key.charCodeAt(seed + 2) & 255) << 16;
        case 2:
          k1 ^= (key.charCodeAt(seed + 1) & 255) << 8;
        case 1:
          k1 ^= key.charCodeAt(seed) & 255, k1 = 3432918353 * (k1 & 65535) + ((3432918353 * (k1 >>> 16) & 65535) << 16) & 4294967295, k1 = k1 << 15 | k1 >>> 17, h1 ^= 461845907 * (k1 & 65535) + ((461845907 * (k1 >>> 16) & 65535) << 16) & 4294967295;
      }
      h1 ^= key.length;
      h1 ^= h1 >>> 16;
      h1 = 2246822507 * (h1 & 65535) + ((2246822507 * (h1 >>> 16) & 65535) << 16) & 4294967295;
      h1 ^= h1 >>> 13;
      h1 = 3266489909 * (h1 & 65535) + ((3266489909 * (h1 >>> 16) & 65535) << 16) & 4294967295;
      return (h1 ^ h1 >>> 16) >>> 0;
    }
    var assign = Object.assign;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var VALID_ATTRIBUTE_NAME_REGEX = RegExp(
      "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
    );
    var illegalAttributeNameCache = {};
    var validatedAttributeNameCache = {};
    function isAttributeNameSafe(attributeName) {
      if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
        return true;
      if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return false;
      if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
        return validatedAttributeNameCache[attributeName] = true;
      illegalAttributeNameCache[attributeName] = true;
      return false;
    }
    var unitlessNumbers = new Set(
      "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
        " "
      )
    );
    var aliases = /* @__PURE__ */ new Map([
      ["acceptCharset", "accept-charset"],
      ["htmlFor", "for"],
      ["httpEquiv", "http-equiv"],
      ["crossOrigin", "crossorigin"],
      ["accentHeight", "accent-height"],
      ["alignmentBaseline", "alignment-baseline"],
      ["arabicForm", "arabic-form"],
      ["baselineShift", "baseline-shift"],
      ["capHeight", "cap-height"],
      ["clipPath", "clip-path"],
      ["clipRule", "clip-rule"],
      ["colorInterpolation", "color-interpolation"],
      ["colorInterpolationFilters", "color-interpolation-filters"],
      ["colorProfile", "color-profile"],
      ["colorRendering", "color-rendering"],
      ["dominantBaseline", "dominant-baseline"],
      ["enableBackground", "enable-background"],
      ["fillOpacity", "fill-opacity"],
      ["fillRule", "fill-rule"],
      ["floodColor", "flood-color"],
      ["floodOpacity", "flood-opacity"],
      ["fontFamily", "font-family"],
      ["fontSize", "font-size"],
      ["fontSizeAdjust", "font-size-adjust"],
      ["fontStretch", "font-stretch"],
      ["fontStyle", "font-style"],
      ["fontVariant", "font-variant"],
      ["fontWeight", "font-weight"],
      ["glyphName", "glyph-name"],
      ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
      ["glyphOrientationVertical", "glyph-orientation-vertical"],
      ["horizAdvX", "horiz-adv-x"],
      ["horizOriginX", "horiz-origin-x"],
      ["imageRendering", "image-rendering"],
      ["letterSpacing", "letter-spacing"],
      ["lightingColor", "lighting-color"],
      ["markerEnd", "marker-end"],
      ["markerMid", "marker-mid"],
      ["markerStart", "marker-start"],
      ["overlinePosition", "overline-position"],
      ["overlineThickness", "overline-thickness"],
      ["paintOrder", "paint-order"],
      ["panose-1", "panose-1"],
      ["pointerEvents", "pointer-events"],
      ["renderingIntent", "rendering-intent"],
      ["shapeRendering", "shape-rendering"],
      ["stopColor", "stop-color"],
      ["stopOpacity", "stop-opacity"],
      ["strikethroughPosition", "strikethrough-position"],
      ["strikethroughThickness", "strikethrough-thickness"],
      ["strokeDasharray", "stroke-dasharray"],
      ["strokeDashoffset", "stroke-dashoffset"],
      ["strokeLinecap", "stroke-linecap"],
      ["strokeLinejoin", "stroke-linejoin"],
      ["strokeMiterlimit", "stroke-miterlimit"],
      ["strokeOpacity", "stroke-opacity"],
      ["strokeWidth", "stroke-width"],
      ["textAnchor", "text-anchor"],
      ["textDecoration", "text-decoration"],
      ["textRendering", "text-rendering"],
      ["transformOrigin", "transform-origin"],
      ["underlinePosition", "underline-position"],
      ["underlineThickness", "underline-thickness"],
      ["unicodeBidi", "unicode-bidi"],
      ["unicodeRange", "unicode-range"],
      ["unitsPerEm", "units-per-em"],
      ["vAlphabetic", "v-alphabetic"],
      ["vHanging", "v-hanging"],
      ["vIdeographic", "v-ideographic"],
      ["vMathematical", "v-mathematical"],
      ["vectorEffect", "vector-effect"],
      ["vertAdvY", "vert-adv-y"],
      ["vertOriginX", "vert-origin-x"],
      ["vertOriginY", "vert-origin-y"],
      ["wordSpacing", "word-spacing"],
      ["writingMode", "writing-mode"],
      ["xmlnsXlink", "xmlns:xlink"],
      ["xHeight", "x-height"]
    ]);
    var matchHtmlRegExp = /["'&<>]/;
    function escapeTextForBrowser(text) {
      if ("boolean" === typeof text || "number" === typeof text || "bigint" === typeof text)
        return "" + text;
      text = "" + text;
      var match = matchHtmlRegExp.exec(text);
      if (match) {
        var html = "", index, lastIndex = 0;
        for (index = match.index; index < text.length; index++) {
          switch (text.charCodeAt(index)) {
            case 34:
              match = "&quot;";
              break;
            case 38:
              match = "&amp;";
              break;
            case 39:
              match = "&#x27;";
              break;
            case 60:
              match = "&lt;";
              break;
            case 62:
              match = "&gt;";
              break;
            default:
              continue;
          }
          lastIndex !== index && (html += text.slice(lastIndex, index));
          lastIndex = index + 1;
          html += match;
        }
        text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
      }
      return text;
    }
    var uppercasePattern = /([A-Z])/g;
    var msPattern = /^ms-/;
    var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
    function sanitizeURL(url) {
      return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
    }
    var ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    var sharedNotPendingObject = {
      pending: false,
      data: null,
      method: null,
      action: null
    };
    var previousDispatcher = ReactDOMSharedInternals.d;
    ReactDOMSharedInternals.d = {
      f: previousDispatcher.f,
      r: previousDispatcher.r,
      D: prefetchDNS,
      C: preconnect,
      L: preload,
      m: preloadModule,
      X: preinitScript,
      S: preinitStyle,
      M: preinitModuleScript
    };
    var PRELOAD_NO_CREDS = [];
    var currentlyFlushingRenderState = null;
    var scriptRegex = /(<\/|<)(s)(cript)/gi;
    function scriptReplacer(match, prefix2, s, suffix2) {
      return "" + prefix2 + ("s" === s ? "\\u0073" : "\\u0053") + suffix2;
    }
    function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
      return {
        idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
        nextFormID: 0,
        streamingFormat: 0,
        bootstrapScriptContent,
        bootstrapScripts,
        bootstrapModules,
        instructions: 0,
        hasBody: false,
        hasHtml: false,
        unknownResources: {},
        dnsResources: {},
        connectResources: { default: {}, anonymous: {}, credentials: {} },
        imageResources: {},
        styleResources: {},
        scriptResources: {},
        moduleUnknownResources: {},
        moduleScriptResources: {}
      };
    }
    function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
      return {
        insertionMode,
        selectedValue,
        tagScope,
        viewTransition
      };
    }
    function getChildFormatContext(parentContext, type, props) {
      var subtreeScope = parentContext.tagScope & -25;
      switch (type) {
        case "noscript":
          return createFormatContext(2, null, subtreeScope | 1, null);
        case "select":
          return createFormatContext(
            2,
            null != props.value ? props.value : props.defaultValue,
            subtreeScope,
            null
          );
        case "svg":
          return createFormatContext(4, null, subtreeScope, null);
        case "picture":
          return createFormatContext(2, null, subtreeScope | 2, null);
        case "math":
          return createFormatContext(5, null, subtreeScope, null);
        case "foreignObject":
          return createFormatContext(2, null, subtreeScope, null);
        case "table":
          return createFormatContext(6, null, subtreeScope, null);
        case "thead":
        case "tbody":
        case "tfoot":
          return createFormatContext(7, null, subtreeScope, null);
        case "colgroup":
          return createFormatContext(9, null, subtreeScope, null);
        case "tr":
          return createFormatContext(8, null, subtreeScope, null);
        case "head":
          if (2 > parentContext.insertionMode)
            return createFormatContext(3, null, subtreeScope, null);
          break;
        case "html":
          if (0 === parentContext.insertionMode)
            return createFormatContext(1, null, subtreeScope, null);
      }
      return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode ? createFormatContext(2, null, subtreeScope, null) : parentContext.tagScope !== subtreeScope ? createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        subtreeScope,
        null
      ) : parentContext;
    }
    function getSuspenseViewTransition(parentViewTransition) {
      return null === parentViewTransition ? null : {
        update: parentViewTransition.update,
        enter: "none",
        exit: "none",
        share: parentViewTransition.update,
        name: parentViewTransition.autoName,
        autoName: parentViewTransition.autoName,
        nameIdx: 0
      };
    }
    function getSuspenseFallbackFormatContext(resumableState, parentContext) {
      parentContext.tagScope & 32 && (resumableState.instructions |= 128);
      return createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        parentContext.tagScope | 12,
        getSuspenseViewTransition(parentContext.viewTransition)
      );
    }
    function getSuspenseContentFormatContext(resumableState, parentContext) {
      resumableState = getSuspenseViewTransition(parentContext.viewTransition);
      var subtreeScope = parentContext.tagScope | 16;
      null !== resumableState && "none" !== resumableState.share && (subtreeScope |= 64);
      return createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        subtreeScope,
        resumableState
      );
    }
    var styleNameCache = /* @__PURE__ */ new Map();
    function pushStyleAttribute(target, style) {
      if ("object" !== typeof style)
        throw Error(
          "The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX."
        );
      var isFirst = true, styleName;
      for (styleName in style)
        if (hasOwnProperty.call(style, styleName)) {
          var styleValue = style[styleName];
          if (null != styleValue && "boolean" !== typeof styleValue && "" !== styleValue) {
            if (0 === styleName.indexOf("--")) {
              var nameChunk = escapeTextForBrowser(styleName);
              styleValue = escapeTextForBrowser(("" + styleValue).trim());
            } else
              nameChunk = styleNameCache.get(styleName), void 0 === nameChunk && (nameChunk = escapeTextForBrowser(
                styleName.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-")
              ), styleNameCache.set(styleName, nameChunk)), styleValue = "number" === typeof styleValue ? 0 === styleValue || unitlessNumbers.has(styleName) ? "" + styleValue : styleValue + "px" : escapeTextForBrowser(("" + styleValue).trim());
            isFirst ? (isFirst = false, target.push(' style="', nameChunk, ":", styleValue)) : target.push(";", nameChunk, ":", styleValue);
          }
        }
      isFirst || target.push('"');
    }
    function pushBooleanAttribute(target, name, value) {
      value && "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, '=""');
    }
    function pushStringAttribute(target, name, value) {
      "function" !== typeof value && "symbol" !== typeof value && "boolean" !== typeof value && target.push(" ", name, '="', escapeTextForBrowser(value), '"');
    }
    var actionJavaScriptURL = escapeTextForBrowser(
      "javascript:throw new Error('React form unexpectedly submitted.')"
    );
    function pushAdditionalFormField(value, key) {
      this.push('<input type="hidden"');
      validateAdditionalFormField(value);
      pushStringAttribute(this, "name", key);
      pushStringAttribute(this, "value", value);
      this.push("/>");
    }
    function validateAdditionalFormField(value) {
      if ("string" !== typeof value)
        throw Error(
          "File/Blob fields are not yet supported in progressive forms. Will fallback to client hydration."
        );
    }
    function getCustomFormFields(resumableState, formAction) {
      if ("function" === typeof formAction.$$FORM_ACTION) {
        var id = resumableState.nextFormID++;
        resumableState = resumableState.idPrefix + id;
        try {
          var customFields = formAction.$$FORM_ACTION(resumableState);
          if (customFields) {
            var formData = customFields.data;
            null != formData && formData.forEach(validateAdditionalFormField);
          }
          return customFields;
        } catch (x) {
          if ("object" === typeof x && null !== x && "function" === typeof x.then)
            throw x;
        }
      }
      return null;
    }
    function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
      var formData = null;
      if ("function" === typeof formAction) {
        var customFields = getCustomFormFields(resumableState, formAction);
        null !== customFields ? (name = customFields.name, formAction = customFields.action || "", formEncType = customFields.encType, formMethod = customFields.method, formTarget = customFields.target, formData = customFields.data) : (target.push(" ", "formAction", '="', actionJavaScriptURL, '"'), formTarget = formMethod = formEncType = formAction = name = null, injectFormReplayingRuntime(resumableState, renderState));
      }
      null != name && pushAttribute(target, "name", name);
      null != formAction && pushAttribute(target, "formAction", formAction);
      null != formEncType && pushAttribute(target, "formEncType", formEncType);
      null != formMethod && pushAttribute(target, "formMethod", formMethod);
      null != formTarget && pushAttribute(target, "formTarget", formTarget);
      return formData;
    }
    function pushAttribute(target, name, value) {
      switch (name) {
        case "className":
          pushStringAttribute(target, "class", value);
          break;
        case "tabIndex":
          pushStringAttribute(target, "tabindex", value);
          break;
        case "dir":
        case "role":
        case "viewBox":
        case "width":
        case "height":
          pushStringAttribute(target, name, value);
          break;
        case "style":
          pushStyleAttribute(target, value);
          break;
        case "src":
        case "href":
          if ("" === value) break;
        case "action":
        case "formAction":
          if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value)
            break;
          value = sanitizeURL("" + value);
          target.push(" ", name, '="', escapeTextForBrowser(value), '"');
          break;
        case "defaultValue":
        case "defaultChecked":
        case "innerHTML":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "ref":
          break;
        case "autoFocus":
        case "multiple":
        case "muted":
          pushBooleanAttribute(target, name.toLowerCase(), value);
          break;
        case "xlinkHref":
          if ("function" === typeof value || "symbol" === typeof value || "boolean" === typeof value)
            break;
          value = sanitizeURL("" + value);
          target.push(" ", "xlink:href", '="', escapeTextForBrowser(value), '"');
          break;
        case "contentEditable":
        case "spellCheck":
        case "draggable":
        case "value":
        case "autoReverse":
        case "externalResourcesRequired":
        case "focusable":
        case "preserveAlpha":
          "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, '="', escapeTextForBrowser(value), '"');
          break;
        case "inert":
        case "allowFullScreen":
        case "async":
        case "autoPlay":
        case "controls":
        case "default":
        case "defer":
        case "disabled":
        case "disablePictureInPicture":
        case "disableRemotePlayback":
        case "formNoValidate":
        case "hidden":
        case "loop":
        case "noModule":
        case "noValidate":
        case "open":
        case "playsInline":
        case "readOnly":
        case "required":
        case "reversed":
        case "scoped":
        case "seamless":
        case "itemScope":
          value && "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, '=""');
          break;
        case "capture":
        case "download":
          true === value ? target.push(" ", name, '=""') : false !== value && "function" !== typeof value && "symbol" !== typeof value && target.push(" ", name, '="', escapeTextForBrowser(value), '"');
          break;
        case "cols":
        case "rows":
        case "size":
        case "span":
          "function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value && target.push(" ", name, '="', escapeTextForBrowser(value), '"');
          break;
        case "rowSpan":
        case "start":
          "function" === typeof value || "symbol" === typeof value || isNaN(value) || target.push(" ", name, '="', escapeTextForBrowser(value), '"');
          break;
        case "xlinkActuate":
          pushStringAttribute(target, "xlink:actuate", value);
          break;
        case "xlinkArcrole":
          pushStringAttribute(target, "xlink:arcrole", value);
          break;
        case "xlinkRole":
          pushStringAttribute(target, "xlink:role", value);
          break;
        case "xlinkShow":
          pushStringAttribute(target, "xlink:show", value);
          break;
        case "xlinkTitle":
          pushStringAttribute(target, "xlink:title", value);
          break;
        case "xlinkType":
          pushStringAttribute(target, "xlink:type", value);
          break;
        case "xmlBase":
          pushStringAttribute(target, "xml:base", value);
          break;
        case "xmlLang":
          pushStringAttribute(target, "xml:lang", value);
          break;
        case "xmlSpace":
          pushStringAttribute(target, "xml:space", value);
          break;
        default:
          if (!(2 < name.length) || "o" !== name[0] && "O" !== name[0] || "n" !== name[1] && "N" !== name[1]) {
            if (name = aliases.get(name) || name, isAttributeNameSafe(name)) {
              switch (typeof value) {
                case "function":
                case "symbol":
                  return;
                case "boolean":
                  var prefix$8 = name.toLowerCase().slice(0, 5);
                  if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
              }
              target.push(" ", name, '="', escapeTextForBrowser(value), '"');
            }
          }
      }
    }
    function pushInnerHTML(target, innerHTML, children) {
      if (null != innerHTML) {
        if (null != children)
          throw Error(
            "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
          );
        if ("object" !== typeof innerHTML || !("__html" in innerHTML))
          throw Error(
            "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
          );
        innerHTML = innerHTML.__html;
        null !== innerHTML && void 0 !== innerHTML && target.push("" + innerHTML);
      }
    }
    function flattenOptionChildren(children) {
      var content = "";
      React2.Children.forEach(children, function(child) {
        null != child && (content += child);
      });
      return content;
    }
    function injectFormReplayingRuntime(resumableState, renderState) {
      if (0 === (resumableState.instructions & 16)) {
        resumableState.instructions |= 16;
        var preamble = renderState.preamble, bootstrapChunks = renderState.bootstrapChunks;
        (preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length ? (bootstrapChunks.push(renderState.startInlineScript), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(
          ">",
          `addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`,
          "</script>"
        )) : bootstrapChunks.unshift(
          renderState.startInlineScript,
          ">",
          `addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`,
          "</script>"
        );
      }
    }
    function pushLinkImpl(target, props) {
      target.push(startChunkForTag("link"));
      for (var propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(
                  "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                );
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push("/>");
      return null;
    }
    var styleRegex = /(<\/|<)(s)(tyle)/gi;
    function styleReplacer(match, prefix2, s, suffix2) {
      return "" + prefix2 + ("s" === s ? "\\73 " : "\\53 ") + suffix2;
    }
    function pushSelfClosing(target, props, tag) {
      target.push(startChunkForTag(tag));
      for (var propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(
                  tag + " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                );
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push("/>");
      return null;
    }
    function pushTitleImpl(target, props) {
      target.push(startChunkForTag("title"));
      var children = null, innerHTML = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(">");
      props = Array.isArray(children) ? 2 > children.length ? children[0] : null : children;
      "function" !== typeof props && "symbol" !== typeof props && null !== props && void 0 !== props && target.push(escapeTextForBrowser("" + props));
      pushInnerHTML(target, innerHTML, children);
      target.push(endChunkForTag("title"));
      return null;
    }
    function pushScriptImpl(target, props) {
      target.push(startChunkForTag("script"));
      var children = null, innerHTML = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(">");
      pushInnerHTML(target, innerHTML, children);
      "string" === typeof children && target.push(("" + children).replace(scriptRegex, scriptReplacer));
      target.push(endChunkForTag("script"));
      return null;
    }
    function pushStartSingletonElement(target, props, tag) {
      target.push(startChunkForTag(tag));
      var innerHTML = tag = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                tag = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(">");
      pushInnerHTML(target, innerHTML, tag);
      return tag;
    }
    function pushStartGenericElement(target, props, tag) {
      target.push(startChunkForTag(tag));
      var innerHTML = tag = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                tag = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(">");
      pushInnerHTML(target, innerHTML, tag);
      return "string" === typeof tag ? (target.push(escapeTextForBrowser(tag)), null) : tag;
    }
    var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/;
    var validatedTagCache = /* @__PURE__ */ new Map();
    function startChunkForTag(tag) {
      var tagStartChunk = validatedTagCache.get(tag);
      if (void 0 === tagStartChunk) {
        if (!VALID_TAG_REGEX.test(tag)) throw Error("Invalid tag: " + tag);
        tagStartChunk = "<" + tag;
        validatedTagCache.set(tag, tagStartChunk);
      }
      return tagStartChunk;
    }
    function pushStartInstance(target$jscomp$0, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
      switch (type) {
        case "div":
        case "span":
        case "svg":
        case "path":
          break;
        case "a":
          target$jscomp$0.push(startChunkForTag("a"));
          var children = null, innerHTML = null, propKey;
          for (propKey in props)
            if (hasOwnProperty.call(props, propKey)) {
              var propValue = props[propKey];
              if (null != propValue)
                switch (propKey) {
                  case "children":
                    children = propValue;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML = propValue;
                    break;
                  case "href":
                    "" === propValue ? pushStringAttribute(target$jscomp$0, "href", "") : pushAttribute(target$jscomp$0, propKey, propValue);
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey, propValue);
                }
            }
          target$jscomp$0.push(">");
          pushInnerHTML(target$jscomp$0, innerHTML, children);
          if ("string" === typeof children) {
            target$jscomp$0.push(escapeTextForBrowser(children));
            var JSCompiler_inline_result = null;
          } else JSCompiler_inline_result = children;
          return JSCompiler_inline_result;
        case "g":
        case "p":
        case "li":
          break;
        case "select":
          target$jscomp$0.push(startChunkForTag("select"));
          var children$jscomp$0 = null, innerHTML$jscomp$0 = null, propKey$jscomp$0;
          for (propKey$jscomp$0 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$0)) {
              var propValue$jscomp$0 = props[propKey$jscomp$0];
              if (null != propValue$jscomp$0)
                switch (propKey$jscomp$0) {
                  case "children":
                    children$jscomp$0 = propValue$jscomp$0;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$0 = propValue$jscomp$0;
                    break;
                  case "defaultValue":
                  case "value":
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$0,
                      propValue$jscomp$0
                    );
                }
            }
          target$jscomp$0.push(">");
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
          return children$jscomp$0;
        case "option":
          var selectedValue = formatContext.selectedValue;
          target$jscomp$0.push(startChunkForTag("option"));
          var children$jscomp$1 = null, value = null, selected = null, innerHTML$jscomp$1 = null, propKey$jscomp$1;
          for (propKey$jscomp$1 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$1)) {
              var propValue$jscomp$1 = props[propKey$jscomp$1];
              if (null != propValue$jscomp$1)
                switch (propKey$jscomp$1) {
                  case "children":
                    children$jscomp$1 = propValue$jscomp$1;
                    break;
                  case "selected":
                    selected = propValue$jscomp$1;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$1 = propValue$jscomp$1;
                    break;
                  case "value":
                    value = propValue$jscomp$1;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$1,
                      propValue$jscomp$1
                    );
                }
            }
          if (null != selectedValue) {
            var stringValue = null !== value ? "" + value : flattenOptionChildren(children$jscomp$1);
            if (isArrayImpl(selectedValue))
              for (var i = 0; i < selectedValue.length; i++) {
                if ("" + selectedValue[i] === stringValue) {
                  target$jscomp$0.push(' selected=""');
                  break;
                }
              }
            else
              "" + selectedValue === stringValue && target$jscomp$0.push(' selected=""');
          } else selected && target$jscomp$0.push(' selected=""');
          target$jscomp$0.push(">");
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
          return children$jscomp$1;
        case "textarea":
          target$jscomp$0.push(startChunkForTag("textarea"));
          var value$jscomp$0 = null, defaultValue = null, children$jscomp$2 = null, propKey$jscomp$2;
          for (propKey$jscomp$2 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$2)) {
              var propValue$jscomp$2 = props[propKey$jscomp$2];
              if (null != propValue$jscomp$2)
                switch (propKey$jscomp$2) {
                  case "children":
                    children$jscomp$2 = propValue$jscomp$2;
                    break;
                  case "value":
                    value$jscomp$0 = propValue$jscomp$2;
                    break;
                  case "defaultValue":
                    defaultValue = propValue$jscomp$2;
                    break;
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "`dangerouslySetInnerHTML` does not make sense on <textarea>."
                    );
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$2,
                      propValue$jscomp$2
                    );
                }
            }
          null === value$jscomp$0 && null !== defaultValue && (value$jscomp$0 = defaultValue);
          target$jscomp$0.push(">");
          if (null != children$jscomp$2) {
            if (null != value$jscomp$0)
              throw Error(
                "If you supply `defaultValue` on a <textarea>, do not pass children."
              );
            if (isArrayImpl(children$jscomp$2)) {
              if (1 < children$jscomp$2.length)
                throw Error("<textarea> can only have at most one child.");
              value$jscomp$0 = "" + children$jscomp$2[0];
            }
            value$jscomp$0 = "" + children$jscomp$2;
          }
          "string" === typeof value$jscomp$0 && "\n" === value$jscomp$0[0] && target$jscomp$0.push("\n");
          null !== value$jscomp$0 && target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0));
          return null;
        case "input":
          target$jscomp$0.push(startChunkForTag("input"));
          var name = null, formAction = null, formEncType = null, formMethod = null, formTarget = null, value$jscomp$1 = null, defaultValue$jscomp$0 = null, checked = null, defaultChecked = null, propKey$jscomp$3;
          for (propKey$jscomp$3 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$3)) {
              var propValue$jscomp$3 = props[propKey$jscomp$3];
              if (null != propValue$jscomp$3)
                switch (propKey$jscomp$3) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
                  case "name":
                    name = propValue$jscomp$3;
                    break;
                  case "formAction":
                    formAction = propValue$jscomp$3;
                    break;
                  case "formEncType":
                    formEncType = propValue$jscomp$3;
                    break;
                  case "formMethod":
                    formMethod = propValue$jscomp$3;
                    break;
                  case "formTarget":
                    formTarget = propValue$jscomp$3;
                    break;
                  case "defaultChecked":
                    defaultChecked = propValue$jscomp$3;
                    break;
                  case "defaultValue":
                    defaultValue$jscomp$0 = propValue$jscomp$3;
                    break;
                  case "checked":
                    checked = propValue$jscomp$3;
                    break;
                  case "value":
                    value$jscomp$1 = propValue$jscomp$3;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$3,
                      propValue$jscomp$3
                    );
                }
            }
          var formData = pushFormActionAttribute(
            target$jscomp$0,
            resumableState,
            renderState,
            formAction,
            formEncType,
            formMethod,
            formTarget,
            name
          );
          null !== checked ? pushBooleanAttribute(target$jscomp$0, "checked", checked) : null !== defaultChecked && pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
          null !== value$jscomp$1 ? pushAttribute(target$jscomp$0, "value", value$jscomp$1) : null !== defaultValue$jscomp$0 && pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
          target$jscomp$0.push("/>");
          null != formData && formData.forEach(pushAdditionalFormField, target$jscomp$0);
          return null;
        case "button":
          target$jscomp$0.push(startChunkForTag("button"));
          var children$jscomp$3 = null, innerHTML$jscomp$2 = null, name$jscomp$0 = null, formAction$jscomp$0 = null, formEncType$jscomp$0 = null, formMethod$jscomp$0 = null, formTarget$jscomp$0 = null, propKey$jscomp$4;
          for (propKey$jscomp$4 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$4)) {
              var propValue$jscomp$4 = props[propKey$jscomp$4];
              if (null != propValue$jscomp$4)
                switch (propKey$jscomp$4) {
                  case "children":
                    children$jscomp$3 = propValue$jscomp$4;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$2 = propValue$jscomp$4;
                    break;
                  case "name":
                    name$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formAction":
                    formAction$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formEncType":
                    formEncType$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formMethod":
                    formMethod$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formTarget":
                    formTarget$jscomp$0 = propValue$jscomp$4;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$4,
                      propValue$jscomp$4
                    );
                }
            }
          var formData$jscomp$0 = pushFormActionAttribute(
            target$jscomp$0,
            resumableState,
            renderState,
            formAction$jscomp$0,
            formEncType$jscomp$0,
            formMethod$jscomp$0,
            formTarget$jscomp$0,
            name$jscomp$0
          );
          target$jscomp$0.push(">");
          null != formData$jscomp$0 && formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
          if ("string" === typeof children$jscomp$3) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
            var JSCompiler_inline_result$jscomp$0 = null;
          } else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
          return JSCompiler_inline_result$jscomp$0;
        case "form":
          target$jscomp$0.push(startChunkForTag("form"));
          var children$jscomp$4 = null, innerHTML$jscomp$3 = null, formAction$jscomp$1 = null, formEncType$jscomp$1 = null, formMethod$jscomp$1 = null, formTarget$jscomp$1 = null, propKey$jscomp$5;
          for (propKey$jscomp$5 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$5)) {
              var propValue$jscomp$5 = props[propKey$jscomp$5];
              if (null != propValue$jscomp$5)
                switch (propKey$jscomp$5) {
                  case "children":
                    children$jscomp$4 = propValue$jscomp$5;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$3 = propValue$jscomp$5;
                    break;
                  case "action":
                    formAction$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "encType":
                    formEncType$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "method":
                    formMethod$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "target":
                    formTarget$jscomp$1 = propValue$jscomp$5;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$5,
                      propValue$jscomp$5
                    );
                }
            }
          var formData$jscomp$1 = null, formActionName = null;
          if ("function" === typeof formAction$jscomp$1) {
            var customFields = getCustomFormFields(
              resumableState,
              formAction$jscomp$1
            );
            null !== customFields ? (formAction$jscomp$1 = customFields.action || "", formEncType$jscomp$1 = customFields.encType, formMethod$jscomp$1 = customFields.method, formTarget$jscomp$1 = customFields.target, formData$jscomp$1 = customFields.data, formActionName = customFields.name) : (target$jscomp$0.push(
              " ",
              "action",
              '="',
              actionJavaScriptURL,
              '"'
            ), formTarget$jscomp$1 = formMethod$jscomp$1 = formEncType$jscomp$1 = formAction$jscomp$1 = null, injectFormReplayingRuntime(resumableState, renderState));
          }
          null != formAction$jscomp$1 && pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
          null != formEncType$jscomp$1 && pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
          null != formMethod$jscomp$1 && pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
          null != formTarget$jscomp$1 && pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
          target$jscomp$0.push(">");
          null !== formActionName && (target$jscomp$0.push('<input type="hidden"'), pushStringAttribute(target$jscomp$0, "name", formActionName), target$jscomp$0.push("/>"), null != formData$jscomp$1 && formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
          if ("string" === typeof children$jscomp$4) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
            var JSCompiler_inline_result$jscomp$1 = null;
          } else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
          return JSCompiler_inline_result$jscomp$1;
        case "menuitem":
          target$jscomp$0.push(startChunkForTag("menuitem"));
          for (var propKey$jscomp$6 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$6)) {
              var propValue$jscomp$6 = props[propKey$jscomp$6];
              if (null != propValue$jscomp$6)
                switch (propKey$jscomp$6) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "menuitems cannot have `children` nor `dangerouslySetInnerHTML`."
                    );
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$6,
                      propValue$jscomp$6
                    );
                }
            }
          target$jscomp$0.push(">");
          return null;
        case "object":
          target$jscomp$0.push(startChunkForTag("object"));
          var children$jscomp$5 = null, innerHTML$jscomp$4 = null, propKey$jscomp$7;
          for (propKey$jscomp$7 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$7)) {
              var propValue$jscomp$7 = props[propKey$jscomp$7];
              if (null != propValue$jscomp$7)
                switch (propKey$jscomp$7) {
                  case "children":
                    children$jscomp$5 = propValue$jscomp$7;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$4 = propValue$jscomp$7;
                    break;
                  case "data":
                    var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                    if ("" === sanitizedValue) break;
                    target$jscomp$0.push(
                      " ",
                      "data",
                      '="',
                      escapeTextForBrowser(sanitizedValue),
                      '"'
                    );
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$7,
                      propValue$jscomp$7
                    );
                }
            }
          target$jscomp$0.push(">");
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
          if ("string" === typeof children$jscomp$5) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
            var JSCompiler_inline_result$jscomp$2 = null;
          } else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
          return JSCompiler_inline_result$jscomp$2;
        case "title":
          var noscriptTagInScope = formatContext.tagScope & 1, isFallback = formatContext.tagScope & 4;
          if (4 === formatContext.insertionMode || noscriptTagInScope || null != props.itemProp)
            var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(
              target$jscomp$0,
              props
            );
          else
            isFallback ? JSCompiler_inline_result$jscomp$3 = null : (pushTitleImpl(renderState.hoistableChunks, props), JSCompiler_inline_result$jscomp$3 = void 0);
          return JSCompiler_inline_result$jscomp$3;
        case "link":
          var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1, isFallback$jscomp$0 = formatContext.tagScope & 4, rel = props.rel, href = props.href, precedence = props.precedence;
          if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$0 || null != props.itemProp || "string" !== typeof rel || "string" !== typeof href || "" === href) {
            pushLinkImpl(target$jscomp$0, props);
            var JSCompiler_inline_result$jscomp$4 = null;
          } else if ("stylesheet" === props.rel)
            if ("string" !== typeof precedence || null != props.disabled || props.onLoad || props.onError)
              JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
                target$jscomp$0,
                props
              );
            else {
              var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
              if (null !== resourceState) {
                resumableState.styleResources[href] = null;
                styleQueue || (styleQueue = {
                  precedence: escapeTextForBrowser(precedence),
                  rules: [],
                  hrefs: [],
                  sheets: /* @__PURE__ */ new Map()
                }, renderState.styles.set(precedence, styleQueue));
                var resource = {
                  state: 0,
                  props: assign({}, props, {
                    "data-precedence": props.precedence,
                    precedence: null
                  })
                };
                if (resourceState) {
                  2 === resourceState.length && adoptPreloadCredentials(resource.props, resourceState);
                  var preloadResource = renderState.preloads.stylesheets.get(href);
                  preloadResource && 0 < preloadResource.length ? preloadResource.length = 0 : resource.state = 1;
                }
                styleQueue.sheets.set(href, resource);
                hoistableState && hoistableState.stylesheets.add(resource);
              } else if (styleQueue) {
                var resource$9 = styleQueue.sheets.get(href);
                resource$9 && hoistableState && hoistableState.stylesheets.add(resource$9);
              }
              textEmbedded && target$jscomp$0.push("<!-- -->");
              JSCompiler_inline_result$jscomp$4 = null;
            }
          else
            props.onLoad || props.onError ? JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
              target$jscomp$0,
              props
            ) : (textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0 ? null : pushLinkImpl(renderState.hoistableChunks, props));
          return JSCompiler_inline_result$jscomp$4;
        case "script":
          var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1, asyncProp = props.async;
          if ("string" !== typeof props.src || !props.src || !asyncProp || "function" === typeof asyncProp || "symbol" === typeof asyncProp || props.onLoad || props.onError || 4 === formatContext.insertionMode || noscriptTagInScope$jscomp$1 || null != props.itemProp)
            var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(
              target$jscomp$0,
              props
            );
          else {
            var key = props.src;
            if ("module" === props.type) {
              var resources = resumableState.moduleScriptResources;
              var preloads = renderState.preloads.moduleScripts;
            } else
              resources = resumableState.scriptResources, preloads = renderState.preloads.scripts;
            var resourceState$jscomp$0 = resources.hasOwnProperty(key) ? resources[key] : void 0;
            if (null !== resourceState$jscomp$0) {
              resources[key] = null;
              var scriptProps = props;
              if (resourceState$jscomp$0) {
                2 === resourceState$jscomp$0.length && (scriptProps = assign({}, props), adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
                var preloadResource$jscomp$0 = preloads.get(key);
                preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
              }
              var resource$jscomp$0 = [];
              renderState.scripts.add(resource$jscomp$0);
              pushScriptImpl(resource$jscomp$0, scriptProps);
            }
            textEmbedded && target$jscomp$0.push("<!-- -->");
            JSCompiler_inline_result$jscomp$5 = null;
          }
          return JSCompiler_inline_result$jscomp$5;
        case "style":
          var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1, precedence$jscomp$0 = props.precedence, href$jscomp$0 = props.href, nonce = props.nonce;
          if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$2 || null != props.itemProp || "string" !== typeof precedence$jscomp$0 || "string" !== typeof href$jscomp$0 || "" === href$jscomp$0) {
            target$jscomp$0.push(startChunkForTag("style"));
            var children$jscomp$6 = null, innerHTML$jscomp$5 = null, propKey$jscomp$8;
            for (propKey$jscomp$8 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$8)) {
                var propValue$jscomp$8 = props[propKey$jscomp$8];
                if (null != propValue$jscomp$8)
                  switch (propKey$jscomp$8) {
                    case "children":
                      children$jscomp$6 = propValue$jscomp$8;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$5 = propValue$jscomp$8;
                      break;
                    default:
                      pushAttribute(
                        target$jscomp$0,
                        propKey$jscomp$8,
                        propValue$jscomp$8
                      );
                  }
              }
            target$jscomp$0.push(">");
            var child = Array.isArray(children$jscomp$6) ? 2 > children$jscomp$6.length ? children$jscomp$6[0] : null : children$jscomp$6;
            "function" !== typeof child && "symbol" !== typeof child && null !== child && void 0 !== child && target$jscomp$0.push(("" + child).replace(styleRegex, styleReplacer));
            pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
            target$jscomp$0.push(endChunkForTag("style"));
            var JSCompiler_inline_result$jscomp$6 = null;
          } else {
            var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
            if (null !== (resumableState.styleResources.hasOwnProperty(href$jscomp$0) ? resumableState.styleResources[href$jscomp$0] : void 0)) {
              resumableState.styleResources[href$jscomp$0] = null;
              styleQueue$jscomp$0 || (styleQueue$jscomp$0 = {
                precedence: escapeTextForBrowser(precedence$jscomp$0),
                rules: [],
                hrefs: [],
                sheets: /* @__PURE__ */ new Map()
              }, renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
              var nonceStyle = renderState.nonce.style;
              if (!nonceStyle || nonceStyle === nonce) {
                styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
                var target = styleQueue$jscomp$0.rules, children$jscomp$7 = null, innerHTML$jscomp$6 = null, propKey$jscomp$9;
                for (propKey$jscomp$9 in props)
                  if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                    var propValue$jscomp$9 = props[propKey$jscomp$9];
                    if (null != propValue$jscomp$9)
                      switch (propKey$jscomp$9) {
                        case "children":
                          children$jscomp$7 = propValue$jscomp$9;
                          break;
                        case "dangerouslySetInnerHTML":
                          innerHTML$jscomp$6 = propValue$jscomp$9;
                      }
                  }
                var child$jscomp$0 = Array.isArray(children$jscomp$7) ? 2 > children$jscomp$7.length ? children$jscomp$7[0] : null : children$jscomp$7;
                "function" !== typeof child$jscomp$0 && "symbol" !== typeof child$jscomp$0 && null !== child$jscomp$0 && void 0 !== child$jscomp$0 && target.push(
                  ("" + child$jscomp$0).replace(styleRegex, styleReplacer)
                );
                pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
              }
            }
            styleQueue$jscomp$0 && hoistableState && hoistableState.styles.add(styleQueue$jscomp$0);
            textEmbedded && target$jscomp$0.push("<!-- -->");
            JSCompiler_inline_result$jscomp$6 = void 0;
          }
          return JSCompiler_inline_result$jscomp$6;
        case "meta":
          var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1, isFallback$jscomp$1 = formatContext.tagScope & 4;
          if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$3 || null != props.itemProp)
            var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(
              target$jscomp$0,
              props,
              "meta"
            );
          else
            textEmbedded && target$jscomp$0.push("<!-- -->"), JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1 ? null : "string" === typeof props.charSet ? pushSelfClosing(renderState.charsetChunks, props, "meta") : "viewport" === props.name ? pushSelfClosing(renderState.viewportChunks, props, "meta") : pushSelfClosing(renderState.hoistableChunks, props, "meta");
          return JSCompiler_inline_result$jscomp$7;
        case "listing":
        case "pre":
          target$jscomp$0.push(startChunkForTag(type));
          var children$jscomp$8 = null, innerHTML$jscomp$7 = null, propKey$jscomp$10;
          for (propKey$jscomp$10 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$10)) {
              var propValue$jscomp$10 = props[propKey$jscomp$10];
              if (null != propValue$jscomp$10)
                switch (propKey$jscomp$10) {
                  case "children":
                    children$jscomp$8 = propValue$jscomp$10;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$7 = propValue$jscomp$10;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$10,
                      propValue$jscomp$10
                    );
                }
            }
          target$jscomp$0.push(">");
          if (null != innerHTML$jscomp$7) {
            if (null != children$jscomp$8)
              throw Error(
                "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
              );
            if ("object" !== typeof innerHTML$jscomp$7 || !("__html" in innerHTML$jscomp$7))
              throw Error(
                "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
              );
            var html = innerHTML$jscomp$7.__html;
            null !== html && void 0 !== html && ("string" === typeof html && 0 < html.length && "\n" === html[0] ? target$jscomp$0.push("\n", html) : target$jscomp$0.push("" + html));
          }
          "string" === typeof children$jscomp$8 && "\n" === children$jscomp$8[0] && target$jscomp$0.push("\n");
          return children$jscomp$8;
        case "img":
          var pictureOrNoScriptTagInScope = formatContext.tagScope & 3, src = props.src, srcSet = props.srcSet;
          if (!("lazy" === props.loading || !src && !srcSet || "string" !== typeof src && null != src || "string" !== typeof srcSet && null != srcSet || "low" === props.fetchPriority || pictureOrNoScriptTagInScope) && ("string" !== typeof src || ":" !== src[4] || "d" !== src[0] && "D" !== src[0] || "a" !== src[1] && "A" !== src[1] || "t" !== src[2] && "T" !== src[2] || "a" !== src[3] && "A" !== src[3]) && ("string" !== typeof srcSet || ":" !== srcSet[4] || "d" !== srcSet[0] && "D" !== srcSet[0] || "a" !== srcSet[1] && "A" !== srcSet[1] || "t" !== srcSet[2] && "T" !== srcSet[2] || "a" !== srcSet[3] && "A" !== srcSet[3])) {
            null !== hoistableState && formatContext.tagScope & 64 && (hoistableState.suspenseyImages = true);
            var sizes = "string" === typeof props.sizes ? props.sizes : void 0, key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src, promotablePreloads = renderState.preloads.images, resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
            if (resource$jscomp$1) {
              if ("high" === props.fetchPriority || 10 > renderState.highImagePreloads.size)
                promotablePreloads.delete(key$jscomp$0), renderState.highImagePreloads.add(resource$jscomp$1);
            } else if (!resumableState.imageResources.hasOwnProperty(key$jscomp$0)) {
              resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
              var input = props.crossOrigin;
              var JSCompiler_inline_result$jscomp$8 = "string" === typeof input ? "use-credentials" === input ? input : "" : void 0;
              var headers = renderState.headers, header;
              headers && 0 < headers.remainingCapacity && "string" !== typeof props.srcSet && ("high" === props.fetchPriority || 500 > headers.highImagePreloads.length) && (header = getPreloadAsHeader(src, "image", {
                imageSrcSet: props.srcSet,
                imageSizes: props.sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                nonce: props.nonce,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.refererPolicy
              }), 0 <= (headers.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS, headers.highImagePreloads && (headers.highImagePreloads += ", "), headers.highImagePreloads += header) : (resource$jscomp$1 = [], pushLinkImpl(resource$jscomp$1, {
                rel: "preload",
                as: "image",
                href: srcSet ? void 0 : src,
                imageSrcSet: srcSet,
                imageSizes: sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              }), "high" === props.fetchPriority || 10 > renderState.highImagePreloads.size ? renderState.highImagePreloads.add(resource$jscomp$1) : (renderState.bulkPreloads.add(resource$jscomp$1), promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
            }
          }
          return pushSelfClosing(target$jscomp$0, props, "img");
        case "base":
        case "area":
        case "br":
        case "col":
        case "embed":
        case "hr":
        case "keygen":
        case "param":
        case "source":
        case "track":
        case "wbr":
          return pushSelfClosing(target$jscomp$0, props, type);
        case "annotation-xml":
        case "color-profile":
        case "font-face":
        case "font-face-src":
        case "font-face-uri":
        case "font-face-format":
        case "font-face-name":
        case "missing-glyph":
          break;
        case "head":
          if (2 > formatContext.insertionMode) {
            var preamble = preambleState || renderState.preamble;
            if (preamble.headChunks)
              throw Error("The `<head>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push("<!--head-->");
            preamble.headChunks = [];
            var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(
              preamble.headChunks,
              props,
              "head"
            );
          } else
            JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(
              target$jscomp$0,
              props,
              "head"
            );
          return JSCompiler_inline_result$jscomp$9;
        case "body":
          if (2 > formatContext.insertionMode) {
            var preamble$jscomp$0 = preambleState || renderState.preamble;
            if (preamble$jscomp$0.bodyChunks)
              throw Error("The `<body>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push("<!--body-->");
            preamble$jscomp$0.bodyChunks = [];
            var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(
              preamble$jscomp$0.bodyChunks,
              props,
              "body"
            );
          } else
            JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(
              target$jscomp$0,
              props,
              "body"
            );
          return JSCompiler_inline_result$jscomp$10;
        case "html":
          if (0 === formatContext.insertionMode) {
            var preamble$jscomp$1 = preambleState || renderState.preamble;
            if (preamble$jscomp$1.htmlChunks)
              throw Error("The `<html>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push("<!--html-->");
            preamble$jscomp$1.htmlChunks = [""];
            var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(
              preamble$jscomp$1.htmlChunks,
              props,
              "html"
            );
          } else
            JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(
              target$jscomp$0,
              props,
              "html"
            );
          return JSCompiler_inline_result$jscomp$11;
        default:
          if (-1 !== type.indexOf("-")) {
            target$jscomp$0.push(startChunkForTag(type));
            var children$jscomp$9 = null, innerHTML$jscomp$8 = null, propKey$jscomp$11;
            for (propKey$jscomp$11 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$11)) {
                var propValue$jscomp$11 = props[propKey$jscomp$11];
                if (null != propValue$jscomp$11) {
                  var attributeName = propKey$jscomp$11;
                  switch (propKey$jscomp$11) {
                    case "children":
                      children$jscomp$9 = propValue$jscomp$11;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$8 = propValue$jscomp$11;
                      break;
                    case "style":
                      pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                      break;
                    case "suppressContentEditableWarning":
                    case "suppressHydrationWarning":
                    case "ref":
                      break;
                    case "className":
                      attributeName = "class";
                    default:
                      if (isAttributeNameSafe(propKey$jscomp$11) && "function" !== typeof propValue$jscomp$11 && "symbol" !== typeof propValue$jscomp$11 && false !== propValue$jscomp$11) {
                        if (true === propValue$jscomp$11) propValue$jscomp$11 = "";
                        else if ("object" === typeof propValue$jscomp$11) continue;
                        target$jscomp$0.push(
                          " ",
                          attributeName,
                          '="',
                          escapeTextForBrowser(propValue$jscomp$11),
                          '"'
                        );
                      }
                  }
                }
              }
            target$jscomp$0.push(">");
            pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
            return children$jscomp$9;
          }
      }
      return pushStartGenericElement(target$jscomp$0, props, type);
    }
    var endTagCache = /* @__PURE__ */ new Map();
    function endChunkForTag(tag) {
      var chunk = endTagCache.get(tag);
      void 0 === chunk && (chunk = "</" + tag + ">", endTagCache.set(tag, chunk));
      return chunk;
    }
    function hoistPreambleState(renderState, preambleState) {
      renderState = renderState.preamble;
      null === renderState.htmlChunks && preambleState.htmlChunks && (renderState.htmlChunks = preambleState.htmlChunks);
      null === renderState.headChunks && preambleState.headChunks && (renderState.headChunks = preambleState.headChunks);
      null === renderState.bodyChunks && preambleState.bodyChunks && (renderState.bodyChunks = preambleState.bodyChunks);
    }
    function writeBootstrap(destination, renderState) {
      renderState = renderState.bootstrapChunks;
      for (var i = 0; i < renderState.length - 1; i++)
        destination.push(renderState[i]);
      return i < renderState.length ? (i = renderState[i], renderState.length = 0, destination.push(i)) : true;
    }
    function writeStartPendingSuspenseBoundary(destination, renderState, id) {
      destination.push('<!--$?--><template id="');
      if (null === id)
        throw Error(
          "An ID must have been assigned before we can complete the boundary."
        );
      destination.push(renderState.boundaryPrefix);
      renderState = id.toString(16);
      destination.push(renderState);
      return destination.push('"></template>');
    }
    function writeStartSegment(destination, renderState, formatContext, id) {
      switch (formatContext.insertionMode) {
        case 0:
        case 1:
        case 3:
        case 2:
          return destination.push('<div hidden id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        case 4:
          return destination.push('<svg aria-hidden="true" style="display:none" id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        case 5:
          return destination.push('<math aria-hidden="true" style="display:none" id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        case 6:
          return destination.push('<table hidden id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        case 7:
          return destination.push('<table hidden><tbody id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        case 8:
          return destination.push('<table hidden><tr id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        case 9:
          return destination.push('<table hidden><colgroup id="'), destination.push(renderState.segmentPrefix), renderState = id.toString(16), destination.push(renderState), destination.push('">');
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    function writeEndSegment(destination, formatContext) {
      switch (formatContext.insertionMode) {
        case 0:
        case 1:
        case 3:
        case 2:
          return destination.push("</div>");
        case 4:
          return destination.push("</svg>");
        case 5:
          return destination.push("</math>");
        case 6:
          return destination.push("</table>");
        case 7:
          return destination.push("</tbody></table>");
        case 8:
          return destination.push("</tr></table>");
        case 9:
          return destination.push("</colgroup></table>");
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
    function escapeJSStringsForInstructionScripts(input) {
      return JSON.stringify(input).replace(
        regexForJSStringsInInstructionScripts,
        function(match) {
          switch (match) {
            case "<":
              return "\\u003c";
            case "\u2028":
              return "\\u2028";
            case "\u2029":
              return "\\u2029";
            default:
              throw Error(
                "escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
              );
          }
        }
      );
    }
    var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
    function escapeJSObjectForInstructionScripts(input) {
      return JSON.stringify(input).replace(
        regexForJSStringsInScripts,
        function(match) {
          switch (match) {
            case "&":
              return "\\u0026";
            case ">":
              return "\\u003e";
            case "<":
              return "\\u003c";
            case "\u2028":
              return "\\u2028";
            case "\u2029":
              return "\\u2029";
            default:
              throw Error(
                "escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
              );
          }
        }
      );
    }
    var currentlyRenderingBoundaryHasStylesToHoist = false;
    var destinationHasCapacity = true;
    function flushStyleTagsLateForBoundary(styleQueue) {
      var rules = styleQueue.rules, hrefs = styleQueue.hrefs, i = 0;
      if (hrefs.length) {
        this.push(currentlyFlushingRenderState.startInlineStyle);
        this.push(' media="not all" data-precedence="');
        this.push(styleQueue.precedence);
        for (this.push('" data-href="'); i < hrefs.length - 1; i++)
          this.push(hrefs[i]), this.push(" ");
        this.push(hrefs[i]);
        this.push('">');
        for (i = 0; i < rules.length; i++) this.push(rules[i]);
        destinationHasCapacity = this.push("</style>");
        currentlyRenderingBoundaryHasStylesToHoist = true;
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function hasStylesToHoist(stylesheet) {
      return 2 !== stylesheet.state ? currentlyRenderingBoundaryHasStylesToHoist = true : false;
    }
    function writeHoistablesForBoundary(destination, hoistableState, renderState) {
      currentlyRenderingBoundaryHasStylesToHoist = false;
      destinationHasCapacity = true;
      currentlyFlushingRenderState = renderState;
      hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
      currentlyFlushingRenderState = null;
      hoistableState.stylesheets.forEach(hasStylesToHoist);
      currentlyRenderingBoundaryHasStylesToHoist && (renderState.stylesToHoist = true);
      return destinationHasCapacity;
    }
    function flushResource(resource) {
      for (var i = 0; i < resource.length; i++) this.push(resource[i]);
      resource.length = 0;
    }
    var stylesheetFlushingQueue = [];
    function flushStyleInPreamble(stylesheet) {
      pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
      for (var i = 0; i < stylesheetFlushingQueue.length; i++)
        this.push(stylesheetFlushingQueue[i]);
      stylesheetFlushingQueue.length = 0;
      stylesheet.state = 2;
    }
    function flushStylesInPreamble(styleQueue) {
      var hasStylesheets = 0 < styleQueue.sheets.size;
      styleQueue.sheets.forEach(flushStyleInPreamble, this);
      styleQueue.sheets.clear();
      var rules = styleQueue.rules, hrefs = styleQueue.hrefs;
      if (!hasStylesheets || hrefs.length) {
        this.push(currentlyFlushingRenderState.startInlineStyle);
        this.push(' data-precedence="');
        this.push(styleQueue.precedence);
        styleQueue = 0;
        if (hrefs.length) {
          for (this.push('" data-href="'); styleQueue < hrefs.length - 1; styleQueue++)
            this.push(hrefs[styleQueue]), this.push(" ");
          this.push(hrefs[styleQueue]);
        }
        this.push('">');
        for (styleQueue = 0; styleQueue < rules.length; styleQueue++)
          this.push(rules[styleQueue]);
        this.push("</style>");
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function preloadLateStyle(stylesheet) {
      if (0 === stylesheet.state) {
        stylesheet.state = 1;
        var props = stylesheet.props;
        pushLinkImpl(stylesheetFlushingQueue, {
          rel: "preload",
          as: "style",
          href: stylesheet.props.href,
          crossOrigin: props.crossOrigin,
          fetchPriority: props.fetchPriority,
          integrity: props.integrity,
          media: props.media,
          hrefLang: props.hrefLang,
          referrerPolicy: props.referrerPolicy
        });
        for (stylesheet = 0; stylesheet < stylesheetFlushingQueue.length; stylesheet++)
          this.push(stylesheetFlushingQueue[stylesheet]);
        stylesheetFlushingQueue.length = 0;
      }
    }
    function preloadLateStyles(styleQueue) {
      styleQueue.sheets.forEach(preloadLateStyle, this);
      styleQueue.sheets.clear();
    }
    function pushCompletedShellIdAttribute(target, resumableState) {
      0 === (resumableState.instructions & 32) && (resumableState.instructions |= 32, target.push(
        ' id="',
        escapeTextForBrowser("_" + resumableState.idPrefix + "R_"),
        '"'
      ));
    }
    function writeStyleResourceDependenciesInJS(destination, hoistableState) {
      destination.push("[");
      var nextArrayOpenBrackChunk = "[";
      hoistableState.stylesheets.forEach(function(resource) {
        if (2 !== resource.state)
          if (3 === resource.state)
            destination.push(nextArrayOpenBrackChunk), resource = escapeJSObjectForInstructionScripts(
              "" + resource.props.href
            ), destination.push(resource), destination.push("]"), nextArrayOpenBrackChunk = ",[";
          else {
            destination.push(nextArrayOpenBrackChunk);
            var precedence = resource.props["data-precedence"], props = resource.props, coercedHref = sanitizeURL("" + resource.props.href);
            coercedHref = escapeJSObjectForInstructionScripts(coercedHref);
            destination.push(coercedHref);
            precedence = "" + precedence;
            destination.push(",");
            precedence = escapeJSObjectForInstructionScripts(precedence);
            destination.push(precedence);
            for (var propKey in props)
              if (hasOwnProperty.call(props, propKey) && (precedence = props[propKey], null != precedence))
                switch (propKey) {
                  case "href":
                  case "rel":
                  case "precedence":
                  case "data-precedence":
                    break;
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
                  default:
                    writeStyleResourceAttributeInJS(
                      destination,
                      propKey,
                      precedence
                    );
                }
            destination.push("]");
            nextArrayOpenBrackChunk = ",[";
            resource.state = 3;
          }
      });
      destination.push("]");
    }
    function writeStyleResourceAttributeInJS(destination, name, value) {
      var attributeName = name.toLowerCase();
      switch (typeof value) {
        case "function":
        case "symbol":
          return;
      }
      switch (name) {
        case "innerHTML":
        case "dangerouslySetInnerHTML":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "style":
        case "ref":
          return;
        case "className":
          attributeName = "class";
          name = "" + value;
          break;
        case "hidden":
          if (false === value) return;
          name = "";
          break;
        case "src":
        case "href":
          value = sanitizeURL(value);
          name = "" + value;
          break;
        default:
          if (2 < name.length && ("o" === name[0] || "O" === name[0]) && ("n" === name[1] || "N" === name[1]) || !isAttributeNameSafe(name))
            return;
          name = "" + value;
      }
      destination.push(",");
      attributeName = escapeJSObjectForInstructionScripts(attributeName);
      destination.push(attributeName);
      destination.push(",");
      attributeName = escapeJSObjectForInstructionScripts(name);
      destination.push(attributeName);
    }
    function createHoistableState() {
      return { styles: /* @__PURE__ */ new Set(), stylesheets: /* @__PURE__ */ new Set(), suspenseyImages: false };
    }
    function prefetchDNS(href) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if ("string" === typeof href && href) {
          if (!resumableState.dnsResources.hasOwnProperty(href)) {
            resumableState.dnsResources[href] = null;
            resumableState = renderState.headers;
            var header, JSCompiler_temp;
            if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity)
              JSCompiler_temp = (header = "<" + ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) + ">; rel=dns-prefetch", 0 <= (resumableState.remainingCapacity -= header.length + 2));
            JSCompiler_temp ? (renderState.resets.dns[href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (header = [], pushLinkImpl(header, { href, rel: "dns-prefetch" }), renderState.preconnects.add(header));
          }
          enqueueFlush(request);
        }
      } else previousDispatcher.D(href);
    }
    function preconnect(href, crossOrigin) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if ("string" === typeof href && href) {
          var bucket = "use-credentials" === crossOrigin ? "credentials" : "string" === typeof crossOrigin ? "anonymous" : "default";
          if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
            resumableState.connectResources[bucket][href] = null;
            resumableState = renderState.headers;
            var header, JSCompiler_temp;
            if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) {
              JSCompiler_temp = "<" + ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) + ">; rel=preconnect";
              if ("string" === typeof crossOrigin) {
                var escapedCrossOrigin = ("" + crossOrigin).replace(
                  regexForLinkHeaderQuotedParamValueContext,
                  escapeStringForLinkHeaderQuotedParamValueContextReplacer
                );
                JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
              }
              JSCompiler_temp = (header = JSCompiler_temp, 0 <= (resumableState.remainingCapacity -= header.length + 2));
            }
            JSCompiler_temp ? (renderState.resets.connect[bucket][href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (bucket = [], pushLinkImpl(bucket, {
              rel: "preconnect",
              href,
              crossOrigin
            }), renderState.preconnects.add(bucket));
          }
          enqueueFlush(request);
        }
      } else previousDispatcher.C(href, crossOrigin);
    }
    function preload(href, as, options) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (as && href) {
          switch (as) {
            case "image":
              if (options) {
                var imageSrcSet = options.imageSrcSet;
                var imageSizes = options.imageSizes;
                var fetchPriority = options.fetchPriority;
              }
              var key = imageSrcSet ? imageSrcSet + "\n" + (imageSizes || "") : href;
              if (resumableState.imageResources.hasOwnProperty(key)) return;
              resumableState.imageResources[key] = PRELOAD_NO_CREDS;
              resumableState = renderState.headers;
              var header;
              resumableState && 0 < resumableState.remainingCapacity && "string" !== typeof imageSrcSet && "high" === fetchPriority && (header = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key] = PRELOAD_NO_CREDS, resumableState.highImagePreloads && (resumableState.highImagePreloads += ", "), resumableState.highImagePreloads += header) : (resumableState = [], pushLinkImpl(
                resumableState,
                assign(
                  { rel: "preload", href: imageSrcSet ? void 0 : href, as },
                  options
                )
              ), "high" === fetchPriority ? renderState.highImagePreloads.add(resumableState) : (renderState.bulkPreloads.add(resumableState), renderState.preloads.images.set(key, resumableState)));
              break;
            case "style":
              if (resumableState.styleResources.hasOwnProperty(href)) return;
              imageSrcSet = [];
              pushLinkImpl(
                imageSrcSet,
                assign({ rel: "preload", href, as }, options)
              );
              resumableState.styleResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
              renderState.preloads.stylesheets.set(href, imageSrcSet);
              renderState.bulkPreloads.add(imageSrcSet);
              break;
            case "script":
              if (resumableState.scriptResources.hasOwnProperty(href)) return;
              imageSrcSet = [];
              renderState.preloads.scripts.set(href, imageSrcSet);
              renderState.bulkPreloads.add(imageSrcSet);
              pushLinkImpl(
                imageSrcSet,
                assign({ rel: "preload", href, as }, options)
              );
              resumableState.scriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
              break;
            default:
              if (resumableState.unknownResources.hasOwnProperty(as)) {
                if (imageSrcSet = resumableState.unknownResources[as], imageSrcSet.hasOwnProperty(href))
                  return;
              } else
                imageSrcSet = {}, resumableState.unknownResources[as] = imageSrcSet;
              imageSrcSet[href] = PRELOAD_NO_CREDS;
              if ((resumableState = renderState.headers) && 0 < resumableState.remainingCapacity && "font" === as && (key = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= key.length + 2)))
                renderState.resets.font[href] = PRELOAD_NO_CREDS, resumableState.fontPreloads && (resumableState.fontPreloads += ", "), resumableState.fontPreloads += key;
              else
                switch (resumableState = [], href = assign({ rel: "preload", href, as }, options), pushLinkImpl(resumableState, href), as) {
                  case "font":
                    renderState.fontPreloads.add(resumableState);
                    break;
                  default:
                    renderState.bulkPreloads.add(resumableState);
                }
          }
          enqueueFlush(request);
        }
      } else previousDispatcher.L(href, as, options);
    }
    function preloadModule(href, options) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (href) {
          var as = options && "string" === typeof options.as ? options.as : "script";
          switch (as) {
            case "script":
              if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
              as = [];
              resumableState.moduleScriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
              renderState.preloads.moduleScripts.set(href, as);
              break;
            default:
              if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
                var resources = resumableState.unknownResources[as];
                if (resources.hasOwnProperty(href)) return;
              } else
                resources = {}, resumableState.moduleUnknownResources[as] = resources;
              as = [];
              resources[href] = PRELOAD_NO_CREDS;
          }
          pushLinkImpl(as, assign({ rel: "modulepreload", href }, options));
          renderState.bulkPreloads.add(as);
          enqueueFlush(request);
        }
      } else previousDispatcher.m(href, options);
    }
    function preinitStyle(href, precedence, options) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (href) {
          precedence = precedence || "default";
          var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
          null !== resourceState && (resumableState.styleResources[href] = null, styleQueue || (styleQueue = {
            precedence: escapeTextForBrowser(precedence),
            rules: [],
            hrefs: [],
            sheets: /* @__PURE__ */ new Map()
          }, renderState.styles.set(precedence, styleQueue)), precedence = {
            state: 0,
            props: assign(
              { rel: "stylesheet", href, "data-precedence": precedence },
              options
            )
          }, resourceState && (2 === resourceState.length && adoptPreloadCredentials(precedence.props, resourceState), (renderState = renderState.preloads.stylesheets.get(href)) && 0 < renderState.length ? renderState.length = 0 : precedence.state = 1), styleQueue.sheets.set(href, precedence), enqueueFlush(request));
        }
      } else previousDispatcher.S(href, precedence, options);
    }
    function preinitScript(src, options) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (src) {
          var resourceState = resumableState.scriptResources.hasOwnProperty(src) ? resumableState.scriptResources[src] : void 0;
          null !== resourceState && (resumableState.scriptResources[src] = null, options = assign({ src, async: true }, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.scripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
        }
      } else previousDispatcher.X(src, options);
    }
    function preinitModuleScript(src, options) {
      var request = currentRequest ? currentRequest : null;
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (src) {
          var resourceState = resumableState.moduleScriptResources.hasOwnProperty(
            src
          ) ? resumableState.moduleScriptResources[src] : void 0;
          null !== resourceState && (resumableState.moduleScriptResources[src] = null, options = assign({ src, type: "module", async: true }, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.moduleScripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
        }
      } else previousDispatcher.M(src, options);
    }
    function adoptPreloadCredentials(target, preloadState) {
      null == target.crossOrigin && (target.crossOrigin = preloadState[0]);
      null == target.integrity && (target.integrity = preloadState[1]);
    }
    function getPreloadAsHeader(href, as, params) {
      href = ("" + href).replace(
        regexForHrefInLinkHeaderURLContext,
        escapeHrefForLinkHeaderURLContextReplacer
      );
      as = ("" + as).replace(
        regexForLinkHeaderQuotedParamValueContext,
        escapeStringForLinkHeaderQuotedParamValueContextReplacer
      );
      as = "<" + href + '>; rel=preload; as="' + as + '"';
      for (var paramName in params)
        hasOwnProperty.call(params, paramName) && (href = params[paramName], "string" === typeof href && (as += "; " + paramName.toLowerCase() + '="' + ("" + href).replace(
          regexForLinkHeaderQuotedParamValueContext,
          escapeStringForLinkHeaderQuotedParamValueContextReplacer
        ) + '"'));
      return as;
    }
    var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
    function escapeHrefForLinkHeaderURLContextReplacer(match) {
      switch (match) {
        case "<":
          return "%3C";
        case ">":
          return "%3E";
        case "\n":
          return "%0A";
        case "\r":
          return "%0D";
        default:
          throw Error(
            "escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
    var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
    function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
      switch (match) {
        case '"':
          return "%22";
        case "'":
          return "%27";
        case ";":
          return "%3B";
        case ",":
          return "%2C";
        case "\n":
          return "%0A";
        case "\r":
          return "%0D";
        default:
          throw Error(
            "escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
    function hoistStyleQueueDependency(styleQueue) {
      this.styles.add(styleQueue);
    }
    function hoistStylesheetDependency(stylesheet) {
      this.stylesheets.add(stylesheet);
    }
    function hoistHoistables(parentState, childState) {
      childState.styles.forEach(hoistStyleQueueDependency, parentState);
      childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
      childState.suspenseyImages && (parentState.suspenseyImages = true);
    }
    function createRenderState(resumableState, generateStaticMarkup) {
      var idPrefix = resumableState.idPrefix, bootstrapChunks = [], bootstrapScriptContent = resumableState.bootstrapScriptContent, bootstrapScripts = resumableState.bootstrapScripts, bootstrapModules = resumableState.bootstrapModules;
      void 0 !== bootstrapScriptContent && (bootstrapChunks.push("<script"), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(
        ">",
        ("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer),
        "</script>"
      ));
      bootstrapScriptContent = idPrefix + "P:";
      var JSCompiler_object_inline_segmentPrefix_1673 = idPrefix + "S:";
      idPrefix += "B:";
      var JSCompiler_object_inline_preconnects_1687 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_fontPreloads_1688 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_highImagePreloads_1689 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_styles_1690 = /* @__PURE__ */ new Map(), JSCompiler_object_inline_bootstrapScripts_1691 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_scripts_1692 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_bulkPreloads_1693 = /* @__PURE__ */ new Set(), JSCompiler_object_inline_preloads_1694 = {
        images: /* @__PURE__ */ new Map(),
        stylesheets: /* @__PURE__ */ new Map(),
        scripts: /* @__PURE__ */ new Map(),
        moduleScripts: /* @__PURE__ */ new Map()
      };
      if (void 0 !== bootstrapScripts)
        for (var i = 0; i < bootstrapScripts.length; i++) {
          var scriptConfig = bootstrapScripts[i], src, crossOrigin = void 0, integrity = void 0, props = {
            rel: "preload",
            as: "script",
            fetchPriority: "low",
            nonce: void 0
          };
          "string" === typeof scriptConfig ? props.href = src = scriptConfig : (props.href = src = scriptConfig.src, props.integrity = integrity = "string" === typeof scriptConfig.integrity ? scriptConfig.integrity : void 0, props.crossOrigin = crossOrigin = "string" === typeof scriptConfig || null == scriptConfig.crossOrigin ? void 0 : "use-credentials" === scriptConfig.crossOrigin ? "use-credentials" : "");
          scriptConfig = resumableState;
          var href = src;
          scriptConfig.scriptResources[href] = null;
          scriptConfig.moduleScriptResources[href] = null;
          scriptConfig = [];
          pushLinkImpl(scriptConfig, props);
          JSCompiler_object_inline_bootstrapScripts_1691.add(scriptConfig);
          bootstrapChunks.push('<script src="', escapeTextForBrowser(src), '"');
          "string" === typeof integrity && bootstrapChunks.push(
            ' integrity="',
            escapeTextForBrowser(integrity),
            '"'
          );
          "string" === typeof crossOrigin && bootstrapChunks.push(
            ' crossorigin="',
            escapeTextForBrowser(crossOrigin),
            '"'
          );
          pushCompletedShellIdAttribute(bootstrapChunks, resumableState);
          bootstrapChunks.push(' async=""></script>');
        }
      if (void 0 !== bootstrapModules)
        for (bootstrapScripts = 0; bootstrapScripts < bootstrapModules.length; bootstrapScripts++)
          props = bootstrapModules[bootstrapScripts], crossOrigin = src = void 0, integrity = {
            rel: "modulepreload",
            fetchPriority: "low",
            nonce: void 0
          }, "string" === typeof props ? integrity.href = i = props : (integrity.href = i = props.src, integrity.integrity = crossOrigin = "string" === typeof props.integrity ? props.integrity : void 0, integrity.crossOrigin = src = "string" === typeof props || null == props.crossOrigin ? void 0 : "use-credentials" === props.crossOrigin ? "use-credentials" : ""), props = resumableState, scriptConfig = i, props.scriptResources[scriptConfig] = null, props.moduleScriptResources[scriptConfig] = null, props = [], pushLinkImpl(props, integrity), JSCompiler_object_inline_bootstrapScripts_1691.add(props), bootstrapChunks.push(
            '<script type="module" src="',
            escapeTextForBrowser(i),
            '"'
          ), "string" === typeof crossOrigin && bootstrapChunks.push(
            ' integrity="',
            escapeTextForBrowser(crossOrigin),
            '"'
          ), "string" === typeof src && bootstrapChunks.push(
            ' crossorigin="',
            escapeTextForBrowser(src),
            '"'
          ), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(' async=""></script>');
      return {
        placeholderPrefix: bootstrapScriptContent,
        segmentPrefix: JSCompiler_object_inline_segmentPrefix_1673,
        boundaryPrefix: idPrefix,
        startInlineScript: "<script",
        startInlineStyle: "<style",
        preamble: { htmlChunks: null, headChunks: null, bodyChunks: null },
        externalRuntimeScript: null,
        bootstrapChunks,
        importMapChunks: [],
        onHeaders: void 0,
        headers: null,
        resets: {
          font: {},
          dns: {},
          connect: { default: {}, anonymous: {}, credentials: {} },
          image: {},
          style: {}
        },
        charsetChunks: [],
        viewportChunks: [],
        hoistableChunks: [],
        preconnects: JSCompiler_object_inline_preconnects_1687,
        fontPreloads: JSCompiler_object_inline_fontPreloads_1688,
        highImagePreloads: JSCompiler_object_inline_highImagePreloads_1689,
        styles: JSCompiler_object_inline_styles_1690,
        bootstrapScripts: JSCompiler_object_inline_bootstrapScripts_1691,
        scripts: JSCompiler_object_inline_scripts_1692,
        bulkPreloads: JSCompiler_object_inline_bulkPreloads_1693,
        preloads: JSCompiler_object_inline_preloads_1694,
        nonce: { script: void 0, style: void 0 },
        stylesToHoist: false,
        generateStaticMarkup
      };
    }
    function pushTextInstance(target, text, renderState, textEmbedded) {
      if (renderState.generateStaticMarkup)
        return target.push(escapeTextForBrowser(text)), false;
      "" === text ? target = textEmbedded : (textEmbedded && target.push("<!-- -->"), target.push(escapeTextForBrowser(text)), target = true);
      return target;
    }
    function pushSegmentFinale(target, renderState, lastPushedText, textEmbedded) {
      renderState.generateStaticMarkup || lastPushedText && textEmbedded && target.push("<!-- -->");
    }
    var bind = Function.prototype.bind;
    var REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference");
    function getComponentNameFromType(type) {
      if (null == type) return null;
      if ("function" === typeof type)
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if ("string" === typeof type) return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if ("object" === typeof type)
        switch (type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {
            }
        }
      return null;
    }
    var emptyContextObject = {};
    var currentActiveSnapshot = null;
    function popToNearestCommonAncestor(prev, next) {
      if (prev !== next) {
        prev.context._currentValue2 = prev.parentValue;
        prev = prev.parent;
        var parentNext = next.parent;
        if (null === prev) {
          if (null !== parentNext)
            throw Error(
              "The stacks must reach the root at the same time. This is a bug in React."
            );
        } else {
          if (null === parentNext)
            throw Error(
              "The stacks must reach the root at the same time. This is a bug in React."
            );
          popToNearestCommonAncestor(prev, parentNext);
        }
        next.context._currentValue2 = next.value;
      }
    }
    function popAllPrevious(prev) {
      prev.context._currentValue2 = prev.parentValue;
      prev = prev.parent;
      null !== prev && popAllPrevious(prev);
    }
    function pushAllNext(next) {
      var parentNext = next.parent;
      null !== parentNext && pushAllNext(parentNext);
      next.context._currentValue2 = next.value;
    }
    function popPreviousToCommonLevel(prev, next) {
      prev.context._currentValue2 = prev.parentValue;
      prev = prev.parent;
      if (null === prev)
        throw Error(
          "The depth must equal at least at zero before reaching the root. This is a bug in React."
        );
      prev.depth === next.depth ? popToNearestCommonAncestor(prev, next) : popPreviousToCommonLevel(prev, next);
    }
    function popNextToCommonLevel(prev, next) {
      var parentNext = next.parent;
      if (null === parentNext)
        throw Error(
          "The depth must equal at least at zero before reaching the root. This is a bug in React."
        );
      prev.depth === parentNext.depth ? popToNearestCommonAncestor(prev, parentNext) : popNextToCommonLevel(prev, parentNext);
      next.context._currentValue2 = next.value;
    }
    function switchContext(newSnapshot) {
      var prev = currentActiveSnapshot;
      prev !== newSnapshot && (null === prev ? pushAllNext(newSnapshot) : null === newSnapshot ? popAllPrevious(prev) : prev.depth === newSnapshot.depth ? popToNearestCommonAncestor(prev, newSnapshot) : prev.depth > newSnapshot.depth ? popPreviousToCommonLevel(prev, newSnapshot) : popNextToCommonLevel(prev, newSnapshot), currentActiveSnapshot = newSnapshot);
    }
    var classComponentUpdater = {
      enqueueSetState: function(inst, payload) {
        inst = inst._reactInternals;
        null !== inst.queue && inst.queue.push(payload);
      },
      enqueueReplaceState: function(inst, payload) {
        inst = inst._reactInternals;
        inst.replace = true;
        inst.queue = [payload];
      },
      enqueueForceUpdate: function() {
      }
    };
    var emptyTreeContext = { id: 1, overflow: "" };
    function pushTreeContext(baseContext, totalChildren, index) {
      var baseIdWithLeadingBit = baseContext.id;
      baseContext = baseContext.overflow;
      var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
      baseIdWithLeadingBit &= ~(1 << baseLength);
      index += 1;
      var length = 32 - clz32(totalChildren) + baseLength;
      if (30 < length) {
        var numberOfOverflowBits = baseLength - baseLength % 5;
        length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
        baseIdWithLeadingBit >>= numberOfOverflowBits;
        baseLength -= numberOfOverflowBits;
        return {
          id: 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit,
          overflow: length + baseContext
        };
      }
      return {
        id: 1 << length | index << baseLength | baseIdWithLeadingBit,
        overflow: baseContext
      };
    }
    var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
    var log = Math.log;
    var LN2 = Math.LN2;
    function clz32Fallback(x) {
      x >>>= 0;
      return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
    }
    function noop() {
    }
    var SuspenseException = Error(
      "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
    );
    function trackUsedThenable(thenableState2, thenable, index) {
      index = thenableState2[index];
      void 0 === index ? thenableState2.push(thenable) : index !== thenable && (thenable.then(noop, noop), thenable = index);
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          "string" === typeof thenable.status ? thenable.then(noop, noop) : (thenableState2 = thenable, thenableState2.status = "pending", thenableState2.then(
            function(fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function(error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
          suspendedThenable = thenable;
          throw SuspenseException;
      }
    }
    var suspendedThenable = null;
    function getSuspendedThenable() {
      if (null === suspendedThenable)
        throw Error(
          "Expected a suspended thenable. This is a bug in React. Please file an issue."
        );
      var thenable = suspendedThenable;
      suspendedThenable = null;
      return thenable;
    }
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    var objectIs = "function" === typeof Object.is ? Object.is : is;
    var currentlyRenderingComponent = null;
    var currentlyRenderingTask = null;
    var currentlyRenderingRequest = null;
    var currentlyRenderingKeyPath = null;
    var firstWorkInProgressHook = null;
    var workInProgressHook = null;
    var isReRender = false;
    var didScheduleRenderPhaseUpdate = false;
    var localIdCounter = 0;
    var actionStateCounter = 0;
    var actionStateMatchingIndex = -1;
    var thenableIndexCounter = 0;
    var thenableState = null;
    var renderPhaseUpdates = null;
    var numberOfReRenders = 0;
    function resolveCurrentlyRenderingComponent() {
      if (null === currentlyRenderingComponent)
        throw Error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
      return currentlyRenderingComponent;
    }
    function createHook() {
      if (0 < numberOfReRenders)
        throw Error("Rendered more hooks than during the previous render");
      return { memoizedState: null, queue: null, next: null };
    }
    function createWorkInProgressHook() {
      null === workInProgressHook ? null === firstWorkInProgressHook ? (isReRender = false, firstWorkInProgressHook = workInProgressHook = createHook()) : (isReRender = true, workInProgressHook = firstWorkInProgressHook) : null === workInProgressHook.next ? (isReRender = false, workInProgressHook = workInProgressHook.next = createHook()) : (isReRender = true, workInProgressHook = workInProgressHook.next);
      return workInProgressHook;
    }
    function getThenableStateAfterSuspending() {
      var state = thenableState;
      thenableState = null;
      return state;
    }
    function resetHooksState() {
      currentlyRenderingKeyPath = currentlyRenderingRequest = currentlyRenderingTask = currentlyRenderingComponent = null;
      didScheduleRenderPhaseUpdate = false;
      firstWorkInProgressHook = null;
      numberOfReRenders = 0;
      workInProgressHook = renderPhaseUpdates = null;
    }
    function basicStateReducer(state, action) {
      return "function" === typeof action ? action(state) : action;
    }
    function useReducer(reducer, initialArg, init) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      if (isReRender) {
        var queue = workInProgressHook.queue;
        initialArg = queue.dispatch;
        if (null !== renderPhaseUpdates && (init = renderPhaseUpdates.get(queue), void 0 !== init)) {
          renderPhaseUpdates.delete(queue);
          queue = workInProgressHook.memoizedState;
          do
            queue = reducer(queue, init.action), init = init.next;
          while (null !== init);
          workInProgressHook.memoizedState = queue;
          return [queue, initialArg];
        }
        return [workInProgressHook.memoizedState, initialArg];
      }
      reducer = reducer === basicStateReducer ? "function" === typeof initialArg ? initialArg() : initialArg : void 0 !== init ? init(initialArg) : initialArg;
      workInProgressHook.memoizedState = reducer;
      reducer = workInProgressHook.queue = { last: null, dispatch: null };
      reducer = reducer.dispatch = dispatchAction.bind(
        null,
        currentlyRenderingComponent,
        reducer
      );
      return [workInProgressHook.memoizedState, reducer];
    }
    function useMemo(nextCreate, deps) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      if (null !== workInProgressHook) {
        var prevState = workInProgressHook.memoizedState;
        if (null !== prevState && null !== deps) {
          var prevDeps = prevState[1];
          a: if (null === prevDeps) prevDeps = false;
          else {
            for (var i = 0; i < prevDeps.length && i < deps.length; i++)
              if (!objectIs(deps[i], prevDeps[i])) {
                prevDeps = false;
                break a;
              }
            prevDeps = true;
          }
          if (prevDeps) return prevState[0];
        }
      }
      nextCreate = nextCreate();
      workInProgressHook.memoizedState = [nextCreate, deps];
      return nextCreate;
    }
    function dispatchAction(componentIdentity, queue, action) {
      if (25 <= numberOfReRenders)
        throw Error(
          "Too many re-renders. React limits the number of renders to prevent an infinite loop."
        );
      if (componentIdentity === currentlyRenderingComponent)
        if (didScheduleRenderPhaseUpdate = true, componentIdentity = { action, next: null }, null === renderPhaseUpdates && (renderPhaseUpdates = /* @__PURE__ */ new Map()), action = renderPhaseUpdates.get(queue), void 0 === action)
          renderPhaseUpdates.set(queue, componentIdentity);
        else {
          for (queue = action; null !== queue.next; ) queue = queue.next;
          queue.next = componentIdentity;
        }
    }
    function throwOnUseEffectEventCall() {
      throw Error(
        "A function wrapped in useEffectEvent can't be called during rendering."
      );
    }
    function unsupportedStartTransition() {
      throw Error("startTransition cannot be called during server rendering.");
    }
    function unsupportedSetOptimisticState() {
      throw Error("Cannot update optimistic state while rendering.");
    }
    function useActionState(action, initialState, permalink) {
      resolveCurrentlyRenderingComponent();
      var actionStateHookIndex = actionStateCounter++, request = currentlyRenderingRequest;
      if ("function" === typeof action.$$FORM_ACTION) {
        var nextPostbackStateKey = null, componentKeyPath = currentlyRenderingKeyPath;
        request = request.formState;
        var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
        if (null !== request && "function" === typeof isSignatureEqual) {
          var postbackKey = request[1];
          isSignatureEqual.call(action, request[2], request[3]) && (nextPostbackStateKey = void 0 !== permalink ? "p" + permalink : "k" + murmurhash3_32_gc(
            JSON.stringify([componentKeyPath, null, actionStateHookIndex]),
            0
          ), postbackKey === nextPostbackStateKey && (actionStateMatchingIndex = actionStateHookIndex, initialState = request[0]));
        }
        var boundAction = action.bind(null, initialState);
        action = function(payload) {
          boundAction(payload);
        };
        "function" === typeof boundAction.$$FORM_ACTION && (action.$$FORM_ACTION = function(prefix2) {
          prefix2 = boundAction.$$FORM_ACTION(prefix2);
          void 0 !== permalink && (permalink += "", prefix2.action = permalink);
          var formData = prefix2.data;
          formData && (null === nextPostbackStateKey && (nextPostbackStateKey = void 0 !== permalink ? "p" + permalink : "k" + murmurhash3_32_gc(
            JSON.stringify([
              componentKeyPath,
              null,
              actionStateHookIndex
            ]),
            0
          )), formData.append("$ACTION_KEY", nextPostbackStateKey));
          return prefix2;
        });
        return [initialState, action, false];
      }
      var boundAction$22 = action.bind(null, initialState);
      return [
        initialState,
        function(payload) {
          boundAction$22(payload);
        },
        false
      ];
    }
    function unwrapThenable(thenable) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      null === thenableState && (thenableState = []);
      return trackUsedThenable(thenableState, thenable, index);
    }
    function unsupportedRefresh() {
      throw Error("Cache cannot be refreshed during server rendering.");
    }
    var HooksDispatcher = {
      readContext: function(context) {
        return context._currentValue2;
      },
      use: function(usable) {
        if (null !== usable && "object" === typeof usable) {
          if ("function" === typeof usable.then) return unwrapThenable(usable);
          if (usable.$$typeof === REACT_CONTEXT_TYPE)
            return usable._currentValue2;
        }
        throw Error("An unsupported type was passed to use(): " + String(usable));
      },
      useContext: function(context) {
        resolveCurrentlyRenderingComponent();
        return context._currentValue2;
      },
      useMemo,
      useReducer,
      useRef: function(initialValue) {
        currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
        workInProgressHook = createWorkInProgressHook();
        var previousRef = workInProgressHook.memoizedState;
        return null === previousRef ? (initialValue = { current: initialValue }, workInProgressHook.memoizedState = initialValue) : previousRef;
      },
      useState: function(initialState) {
        return useReducer(basicStateReducer, initialState);
      },
      useInsertionEffect: noop,
      useLayoutEffect: noop,
      useCallback: function(callback, deps) {
        return useMemo(function() {
          return callback;
        }, deps);
      },
      useImperativeHandle: noop,
      useEffect: noop,
      useDebugValue: noop,
      useDeferredValue: function(value, initialValue) {
        resolveCurrentlyRenderingComponent();
        return void 0 !== initialValue ? initialValue : value;
      },
      useTransition: function() {
        resolveCurrentlyRenderingComponent();
        return [false, unsupportedStartTransition];
      },
      useId: function() {
        var JSCompiler_inline_result = currentlyRenderingTask.treeContext;
        var overflow = JSCompiler_inline_result.overflow;
        JSCompiler_inline_result = JSCompiler_inline_result.id;
        JSCompiler_inline_result = (JSCompiler_inline_result & ~(1 << 32 - clz32(JSCompiler_inline_result) - 1)).toString(32) + overflow;
        var resumableState = currentResumableState;
        if (null === resumableState)
          throw Error(
            "Invalid hook call. Hooks can only be called inside of the body of a function component."
          );
        overflow = localIdCounter++;
        JSCompiler_inline_result = "_" + resumableState.idPrefix + "R_" + JSCompiler_inline_result;
        0 < overflow && (JSCompiler_inline_result += "H" + overflow.toString(32));
        return JSCompiler_inline_result + "_";
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        if (void 0 === getServerSnapshot)
          throw Error(
            "Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering."
          );
        return getServerSnapshot();
      },
      useOptimistic: function(passthrough) {
        resolveCurrentlyRenderingComponent();
        return [passthrough, unsupportedSetOptimisticState];
      },
      useActionState,
      useFormState: useActionState,
      useHostTransitionStatus: function() {
        resolveCurrentlyRenderingComponent();
        return sharedNotPendingObject;
      },
      useMemoCache: function(size) {
        for (var data = Array(size), i = 0; i < size; i++)
          data[i] = REACT_MEMO_CACHE_SENTINEL;
        return data;
      },
      useCacheRefresh: function() {
        return unsupportedRefresh;
      },
      useEffectEvent: function() {
        return throwOnUseEffectEventCall;
      }
    };
    var currentResumableState = null;
    var DefaultAsyncDispatcher = {
      getCacheForType: function() {
        throw Error("Not implemented.");
      },
      cacheSignal: function() {
        throw Error("Not implemented.");
      }
    };
    var prefix;
    var suffix;
    function describeBuiltInComponentFrame(name) {
      if (void 0 === prefix)
        try {
          throw Error();
        } catch (x) {
          var match = x.stack.trim().match(/\n( *(at )?)/);
          prefix = match && match[1] || "";
          suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
        }
      return "\n" + prefix + name + suffix;
    }
    var reentry = false;
    function describeNativeComponentFrame(fn, construct) {
      if (!fn || reentry) return "";
      reentry = true;
      var previousPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = void 0;
      try {
        var RunInRootFrame = {
          DetermineComponentFrameRoot: function() {
            try {
              if (construct) {
                var Fake = function() {
                  throw Error();
                };
                Object.defineProperty(Fake.prototype, "props", {
                  set: function() {
                    throw Error();
                  }
                });
                if ("object" === typeof Reflect && Reflect.construct) {
                  try {
                    Reflect.construct(Fake, []);
                  } catch (x) {
                    var control = x;
                  }
                  Reflect.construct(fn, [], Fake);
                } else {
                  try {
                    Fake.call();
                  } catch (x$24) {
                    control = x$24;
                  }
                  fn.call(Fake.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (x$25) {
                  control = x$25;
                }
                (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
                });
              }
            } catch (sample) {
              if (sample && control && "string" === typeof sample.stack)
                return [sample.stack, control.stack];
            }
            return [null, null];
          }
        };
        RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
        var namePropDescriptor = Object.getOwnPropertyDescriptor(
          RunInRootFrame.DetermineComponentFrameRoot,
          "name"
        );
        namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
          RunInRootFrame.DetermineComponentFrameRoot,
          "name",
          { value: "DetermineComponentFrameRoot" }
        );
        var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
        if (sampleStack && controlStack) {
          var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
          for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot"); )
            RunInRootFrame++;
          for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes(
            "DetermineComponentFrameRoot"
          ); )
            namePropDescriptor++;
          if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length)
            for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]; )
              namePropDescriptor--;
          for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--)
            if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
              if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
                do
                  if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
                    var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
                    fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
                    return frame;
                  }
                while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
              }
              break;
            }
        }
      } finally {
        reentry = false, Error.prepareStackTrace = previousPrepareStackTrace;
      }
      return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
    }
    function describeComponentStackByType(type) {
      if ("string" === typeof type) return describeBuiltInComponentFrame(type);
      if ("function" === typeof type)
        return type.prototype && type.prototype.isReactComponent ? describeNativeComponentFrame(type, true) : describeNativeComponentFrame(type, false);
      if ("object" === typeof type && null !== type) {
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            return describeNativeComponentFrame(type.render, false);
          case REACT_MEMO_TYPE:
            return describeNativeComponentFrame(type.type, false);
          case REACT_LAZY_TYPE:
            var lazyComponent = type, payload = lazyComponent._payload;
            lazyComponent = lazyComponent._init;
            try {
              type = lazyComponent(payload);
            } catch (x) {
              return describeBuiltInComponentFrame("Lazy");
            }
            return describeComponentStackByType(type);
        }
        if ("string" === typeof type.name) {
          a: {
            payload = type.name;
            lazyComponent = type.env;
            var location = type.debugLocation;
            if (null != location && (type = Error.prepareStackTrace, Error.prepareStackTrace = void 0, location = location.stack, Error.prepareStackTrace = type, location.startsWith("Error: react-stack-top-frame\n") && (location = location.slice(29)), type = location.indexOf("\n"), -1 !== type && (location = location.slice(type + 1)), type = location.indexOf("react_stack_bottom_frame"), -1 !== type && (type = location.lastIndexOf("\n", type)), type = -1 !== type ? location = location.slice(0, type) : "", location = type.lastIndexOf("\n"), type = -1 === location ? type : type.slice(location + 1), -1 !== type.indexOf(payload))) {
              payload = "\n" + type;
              break a;
            }
            payload = describeBuiltInComponentFrame(
              payload + (lazyComponent ? " [" + lazyComponent + "]" : "")
            );
          }
          return payload;
        }
      }
      switch (type) {
        case REACT_SUSPENSE_LIST_TYPE:
          return describeBuiltInComponentFrame("SuspenseList");
        case REACT_SUSPENSE_TYPE:
          return describeBuiltInComponentFrame("Suspense");
      }
      return "";
    }
    function isEligibleForOutlining(request, boundary) {
      return (500 < boundary.byteSize || false) && null === boundary.contentPreamble;
    }
    function defaultErrorHandler(error) {
      if ("object" === typeof error && null !== error && "string" === typeof error.environmentName) {
        var JSCompiler_inline_result = error.environmentName;
        error = [error].slice(0);
        "string" === typeof error[0] ? error.splice(
          0,
          1,
          "[%s] " + error[0],
          " " + JSCompiler_inline_result + " "
        ) : error.splice(0, 0, "[%s]", " " + JSCompiler_inline_result + " ");
        error.unshift(console);
        JSCompiler_inline_result = bind.apply(console.error, error);
        JSCompiler_inline_result();
      } else console.error(error);
      return null;
    }
    function RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError2, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
      var abortSet = /* @__PURE__ */ new Set();
      this.destination = null;
      this.flushScheduled = false;
      this.resumableState = resumableState;
      this.renderState = renderState;
      this.rootFormatContext = rootFormatContext;
      this.progressiveChunkSize = void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
      this.status = 10;
      this.fatalError = null;
      this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
      this.completedPreambleSegments = this.completedRootSegment = null;
      this.byteSize = 0;
      this.abortableTasks = abortSet;
      this.pingedTasks = [];
      this.clientRenderedBoundaries = [];
      this.completedBoundaries = [];
      this.partialBoundaries = [];
      this.trackedPostpones = null;
      this.onError = void 0 === onError2 ? defaultErrorHandler : onError2;
      this.onPostpone = void 0 === onPostpone ? noop : onPostpone;
      this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
      this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
      this.onShellError = void 0 === onShellError ? noop : onShellError;
      this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
      this.formState = void 0 === formState ? null : formState;
    }
    function createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError2, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
      resumableState = new RequestInstance(
        resumableState,
        renderState,
        rootFormatContext,
        progressiveChunkSize,
        onError2,
        onAllReady,
        onShellReady,
        onShellError,
        onFatalError,
        onPostpone,
        formState
      );
      renderState = createPendingSegment(
        resumableState,
        0,
        null,
        rootFormatContext,
        false,
        false
      );
      renderState.parentFlushed = true;
      children = createRenderTask(
        resumableState,
        null,
        children,
        -1,
        null,
        renderState,
        null,
        null,
        resumableState.abortableTasks,
        null,
        rootFormatContext,
        null,
        emptyTreeContext,
        null,
        null
      );
      pushComponentStack(children);
      resumableState.pingedTasks.push(children);
      return resumableState;
    }
    var currentRequest = null;
    function pingTask(request, task) {
      request.pingedTasks.push(task);
      1 === request.pingedTasks.length && (request.flushScheduled = null !== request.destination, performWork(request));
    }
    function createSuspenseBoundary(request, row, fallbackAbortableTasks, contentPreamble, fallbackPreamble) {
      fallbackAbortableTasks = {
        status: 0,
        rootSegmentID: -1,
        parentFlushed: false,
        pendingTasks: 0,
        row,
        completedSegments: [],
        byteSize: 0,
        fallbackAbortableTasks,
        errorDigest: null,
        contentState: createHoistableState(),
        fallbackState: createHoistableState(),
        contentPreamble,
        fallbackPreamble,
        trackedContentKeyPath: null,
        trackedFallbackNode: null
      };
      null !== row && (row.pendingTasks++, contentPreamble = row.boundaries, null !== contentPreamble && (request.allPendingTasks++, fallbackAbortableTasks.pendingTasks++, contentPreamble.push(fallbackAbortableTasks)), request = row.inheritedHoistables, null !== request && hoistHoistables(fallbackAbortableTasks.contentState, request));
      return fallbackAbortableTasks;
    }
    function createRenderTask(request, thenableState2, node, childIndex, blockedBoundary, blockedSegment, blockedPreamble, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
      request.allPendingTasks++;
      null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
      null !== row && row.pendingTasks++;
      var task = {
        replay: null,
        node,
        childIndex,
        ping: function() {
          return pingTask(request, task);
        },
        blockedBoundary,
        blockedSegment,
        blockedPreamble,
        hoistableState,
        abortSet,
        keyPath,
        formatContext,
        context,
        treeContext,
        row,
        componentStack,
        thenableState: thenableState2
      };
      abortSet.add(task);
      return task;
    }
    function createReplayTask(request, thenableState2, replay, node, childIndex, blockedBoundary, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
      request.allPendingTasks++;
      null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
      null !== row && row.pendingTasks++;
      replay.pendingTasks++;
      var task = {
        replay,
        node,
        childIndex,
        ping: function() {
          return pingTask(request, task);
        },
        blockedBoundary,
        blockedSegment: null,
        blockedPreamble: null,
        hoistableState,
        abortSet,
        keyPath,
        formatContext,
        context,
        treeContext,
        row,
        componentStack,
        thenableState: thenableState2
      };
      abortSet.add(task);
      return task;
    }
    function createPendingSegment(request, index, boundary, parentFormatContext, lastPushedText, textEmbedded) {
      return {
        status: 0,
        parentFlushed: false,
        id: -1,
        index,
        chunks: [],
        children: [],
        preambleChildren: [],
        parentFormatContext,
        boundary,
        lastPushedText,
        textEmbedded
      };
    }
    function pushComponentStack(task) {
      var node = task.node;
      if ("object" === typeof node && null !== node)
        switch (node.$$typeof) {
          case REACT_ELEMENT_TYPE:
            task.componentStack = { parent: task.componentStack, type: node.type };
        }
    }
    function replaceSuspenseComponentStackWithSuspenseFallbackStack(componentStack) {
      return null === componentStack ? null : { parent: componentStack.parent, type: "Suspense Fallback" };
    }
    function getThrownInfo(node$jscomp$0) {
      var errorInfo = {};
      node$jscomp$0 && Object.defineProperty(errorInfo, "componentStack", {
        configurable: true,
        enumerable: true,
        get: function() {
          try {
            var info = "", node = node$jscomp$0;
            do
              info += describeComponentStackByType(node.type), node = node.parent;
            while (node);
            var JSCompiler_inline_result = info;
          } catch (x) {
            JSCompiler_inline_result = "\nError generating stack: " + x.message + "\n" + x.stack;
          }
          Object.defineProperty(errorInfo, "componentStack", {
            value: JSCompiler_inline_result
          });
          return JSCompiler_inline_result;
        }
      });
      return errorInfo;
    }
    function logRecoverableError(request, error, errorInfo) {
      request = request.onError;
      error = request(error, errorInfo);
      if (null == error || "string" === typeof error) return error;
    }
    function fatalError(request, error) {
      var onShellError = request.onShellError, onFatalError = request.onFatalError;
      onShellError(error);
      onFatalError(error);
      null !== request.destination ? (request.status = 14, request.destination.destroy(error)) : (request.status = 13, request.fatalError = error);
    }
    function finishSuspenseListRow(request, row) {
      unblockSuspenseListRow(request, row.next, row.hoistables);
    }
    function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
      for (; null !== unblockedRow; ) {
        null !== inheritedHoistables && (hoistHoistables(unblockedRow.hoistables, inheritedHoistables), unblockedRow.inheritedHoistables = inheritedHoistables);
        var unblockedBoundaries = unblockedRow.boundaries;
        if (null !== unblockedBoundaries) {
          unblockedRow.boundaries = null;
          for (var i = 0; i < unblockedBoundaries.length; i++) {
            var unblockedBoundary = unblockedBoundaries[i];
            null !== inheritedHoistables && hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
            finishedTask(request, unblockedBoundary, null, null);
          }
        }
        unblockedRow.pendingTasks--;
        if (0 < unblockedRow.pendingTasks) break;
        inheritedHoistables = unblockedRow.hoistables;
        unblockedRow = unblockedRow.next;
      }
    }
    function tryToResolveTogetherRow(request, togetherRow) {
      var boundaries = togetherRow.boundaries;
      if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
        for (var allCompleteAndInlinable = true, i = 0; i < boundaries.length; i++) {
          var rowBoundary = boundaries[i];
          if (1 !== rowBoundary.pendingTasks || rowBoundary.parentFlushed || isEligibleForOutlining(request, rowBoundary)) {
            allCompleteAndInlinable = false;
            break;
          }
        }
        allCompleteAndInlinable && unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
      }
    }
    function createSuspenseListRow(previousRow) {
      var newRow = {
        pendingTasks: 1,
        boundaries: null,
        hoistables: createHoistableState(),
        inheritedHoistables: null,
        together: false,
        next: null
      };
      null !== previousRow && 0 < previousRow.pendingTasks && (newRow.pendingTasks++, newRow.boundaries = [], previousRow.next = newRow);
      return newRow;
    }
    function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
      var prevKeyPath = task.keyPath, prevTreeContext = task.treeContext, prevRow = task.row;
      task.keyPath = keyPath;
      keyPath = rows.length;
      var previousSuspenseListRow = null;
      if (null !== task.replay) {
        var resumeSlots = task.replay.slots;
        if (null !== resumeSlots && "object" === typeof resumeSlots)
          for (var n = 0; n < keyPath; n++) {
            var i = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? n : keyPath - 1 - n, node = rows[i];
            task.row = previousSuspenseListRow = createSuspenseListRow(
              previousSuspenseListRow
            );
            task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
            var resumeSegmentID = resumeSlots[i];
            "number" === typeof resumeSegmentID ? (resumeNode(request, task, resumeSegmentID, node, i), delete resumeSlots[i]) : renderNode(request, task, node, i);
            0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
          }
        else
          for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++)
            n = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? resumeSlots : keyPath - 1 - resumeSlots, i = rows[n], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, n), renderNode(request, task, i, n), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
      } else if ("backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder)
        for (revealOrder = 0; revealOrder < keyPath; revealOrder++)
          resumeSlots = rows[revealOrder], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(
            prevTreeContext,
            keyPath,
            revealOrder
          ), renderNode(request, task, resumeSlots, revealOrder), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
      else {
        revealOrder = task.blockedSegment;
        resumeSlots = revealOrder.children.length;
        n = revealOrder.chunks.length;
        for (i = keyPath - 1; 0 <= i; i--) {
          node = rows[i];
          task.row = previousSuspenseListRow = createSuspenseListRow(
            previousSuspenseListRow
          );
          task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
          resumeSegmentID = createPendingSegment(
            request,
            n,
            null,
            task.formatContext,
            0 === i ? revealOrder.lastPushedText : true,
            true
          );
          revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
          task.blockedSegment = resumeSegmentID;
          try {
            renderNode(request, task, node, i), pushSegmentFinale(
              resumeSegmentID.chunks,
              request.renderState,
              resumeSegmentID.lastPushedText,
              resumeSegmentID.textEmbedded
            ), resumeSegmentID.status = 1, 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
          } catch (thrownValue) {
            throw resumeSegmentID.status = 12 === request.status ? 3 : 4, thrownValue;
          }
        }
        task.blockedSegment = revealOrder;
        revealOrder.lastPushedText = false;
      }
      null !== prevRow && null !== previousSuspenseListRow && 0 < previousSuspenseListRow.pendingTasks && (prevRow.pendingTasks++, previousSuspenseListRow.next = prevRow);
      task.treeContext = prevTreeContext;
      task.row = prevRow;
      task.keyPath = prevKeyPath;
    }
    function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
      var prevThenableState = task.thenableState;
      task.thenableState = null;
      currentlyRenderingComponent = {};
      currentlyRenderingTask = task;
      currentlyRenderingRequest = request;
      currentlyRenderingKeyPath = keyPath;
      actionStateCounter = localIdCounter = 0;
      actionStateMatchingIndex = -1;
      thenableIndexCounter = 0;
      thenableState = prevThenableState;
      for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate; )
        didScheduleRenderPhaseUpdate = false, actionStateCounter = localIdCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, numberOfReRenders += 1, workInProgressHook = null, request = Component(props, secondArg);
      resetHooksState();
      return request;
    }
    function finishFunctionComponent(request, task, keyPath, children, hasId, actionStateCount, actionStateMatchingIndex2) {
      var didEmitActionStateMarkers = false;
      if (0 !== actionStateCount && null !== request.formState) {
        var segment = task.blockedSegment;
        if (null !== segment) {
          didEmitActionStateMarkers = true;
          segment = segment.chunks;
          for (var i = 0; i < actionStateCount; i++)
            i === actionStateMatchingIndex2 ? segment.push("<!--F!-->") : segment.push("<!--F-->");
        }
      }
      actionStateCount = task.keyPath;
      task.keyPath = keyPath;
      hasId ? (keyPath = task.treeContext, task.treeContext = pushTreeContext(keyPath, 1, 0), renderNode(request, task, children, -1), task.treeContext = keyPath) : didEmitActionStateMarkers ? renderNode(request, task, children, -1) : renderNodeDestructive(request, task, children, -1);
      task.keyPath = actionStateCount;
    }
    function renderElement(request, task, keyPath, type, props, ref) {
      if ("function" === typeof type)
        if (type.prototype && type.prototype.isReactComponent) {
          var newProps = props;
          if ("ref" in props) {
            newProps = {};
            for (var propName in props)
              "ref" !== propName && (newProps[propName] = props[propName]);
          }
          var defaultProps = type.defaultProps;
          if (defaultProps) {
            newProps === props && (newProps = assign({}, newProps, props));
            for (var propName$43 in defaultProps)
              void 0 === newProps[propName$43] && (newProps[propName$43] = defaultProps[propName$43]);
          }
          props = newProps;
          newProps = emptyContextObject;
          defaultProps = type.contextType;
          "object" === typeof defaultProps && null !== defaultProps && (newProps = defaultProps._currentValue2);
          newProps = new type(props, newProps);
          var initialState = void 0 !== newProps.state ? newProps.state : null;
          newProps.updater = classComponentUpdater;
          newProps.props = props;
          newProps.state = initialState;
          defaultProps = { queue: [], replace: false };
          newProps._reactInternals = defaultProps;
          ref = type.contextType;
          newProps.context = "object" === typeof ref && null !== ref ? ref._currentValue2 : emptyContextObject;
          ref = type.getDerivedStateFromProps;
          "function" === typeof ref && (ref = ref(props, initialState), initialState = null === ref || void 0 === ref ? initialState : assign({}, initialState, ref), newProps.state = initialState);
          if ("function" !== typeof type.getDerivedStateFromProps && "function" !== typeof newProps.getSnapshotBeforeUpdate && ("function" === typeof newProps.UNSAFE_componentWillMount || "function" === typeof newProps.componentWillMount))
            if (type = newProps.state, "function" === typeof newProps.componentWillMount && newProps.componentWillMount(), "function" === typeof newProps.UNSAFE_componentWillMount && newProps.UNSAFE_componentWillMount(), type !== newProps.state && classComponentUpdater.enqueueReplaceState(
              newProps,
              newProps.state,
              null
            ), null !== defaultProps.queue && 0 < defaultProps.queue.length)
              if (type = defaultProps.queue, ref = defaultProps.replace, defaultProps.queue = null, defaultProps.replace = false, ref && 1 === type.length)
                newProps.state = type[0];
              else {
                defaultProps = ref ? type[0] : newProps.state;
                initialState = true;
                for (ref = ref ? 1 : 0; ref < type.length; ref++)
                  propName$43 = type[ref], propName$43 = "function" === typeof propName$43 ? propName$43.call(newProps, defaultProps, props, void 0) : propName$43, null != propName$43 && (initialState ? (initialState = false, defaultProps = assign({}, defaultProps, propName$43)) : assign(defaultProps, propName$43));
                newProps.state = defaultProps;
              }
            else defaultProps.queue = null;
          type = newProps.render();
          if (12 === request.status) throw null;
          props = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, type, -1);
          task.keyPath = props;
        } else {
          type = renderWithHooks(request, task, keyPath, type, props, void 0);
          if (12 === request.status) throw null;
          finishFunctionComponent(
            request,
            task,
            keyPath,
            type,
            0 !== localIdCounter,
            actionStateCounter,
            actionStateMatchingIndex
          );
        }
      else if ("string" === typeof type)
        if (newProps = task.blockedSegment, null === newProps)
          newProps = props.children, defaultProps = task.formatContext, initialState = task.keyPath, task.formatContext = getChildFormatContext(defaultProps, type, props), task.keyPath = keyPath, renderNode(request, task, newProps, -1), task.formatContext = defaultProps, task.keyPath = initialState;
        else {
          initialState = pushStartInstance(
            newProps.chunks,
            type,
            props,
            request.resumableState,
            request.renderState,
            task.blockedPreamble,
            task.hoistableState,
            task.formatContext,
            newProps.lastPushedText
          );
          newProps.lastPushedText = false;
          defaultProps = task.formatContext;
          ref = task.keyPath;
          task.keyPath = keyPath;
          if (3 === (task.formatContext = getChildFormatContext(defaultProps, type, props)).insertionMode) {
            keyPath = createPendingSegment(
              request,
              0,
              null,
              task.formatContext,
              false,
              false
            );
            newProps.preambleChildren.push(keyPath);
            task.blockedSegment = keyPath;
            try {
              keyPath.status = 6, renderNode(request, task, initialState, -1), pushSegmentFinale(
                keyPath.chunks,
                request.renderState,
                keyPath.lastPushedText,
                keyPath.textEmbedded
              ), keyPath.status = 1;
            } finally {
              task.blockedSegment = newProps;
            }
          } else renderNode(request, task, initialState, -1);
          task.formatContext = defaultProps;
          task.keyPath = ref;
          a: {
            task = newProps.chunks;
            request = request.resumableState;
            switch (type) {
              case "title":
              case "style":
              case "script":
              case "area":
              case "base":
              case "br":
              case "col":
              case "embed":
              case "hr":
              case "img":
              case "input":
              case "keygen":
              case "link":
              case "meta":
              case "param":
              case "source":
              case "track":
              case "wbr":
                break a;
              case "body":
                if (1 >= defaultProps.insertionMode) {
                  request.hasBody = true;
                  break a;
                }
                break;
              case "html":
                if (0 === defaultProps.insertionMode) {
                  request.hasHtml = true;
                  break a;
                }
                break;
              case "head":
                if (1 >= defaultProps.insertionMode) break a;
            }
            task.push(endChunkForTag(type));
          }
          newProps.lastPushedText = false;
        }
      else {
        switch (type) {
          case REACT_LEGACY_HIDDEN_TYPE:
          case REACT_STRICT_MODE_TYPE:
          case REACT_PROFILER_TYPE:
          case REACT_FRAGMENT_TYPE:
            type = task.keyPath;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, props.children, -1);
            task.keyPath = type;
            return;
          case REACT_ACTIVITY_TYPE:
            type = task.blockedSegment;
            null === type ? "hidden" !== props.mode && (type = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = type) : "hidden" !== props.mode && (request.renderState.generateStaticMarkup || type.chunks.push("<!--&-->"), type.lastPushedText = false, newProps = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = newProps, request.renderState.generateStaticMarkup || type.chunks.push("<!--/&-->"), type.lastPushedText = false);
            return;
          case REACT_SUSPENSE_LIST_TYPE:
            a: {
              type = props.children;
              props = props.revealOrder;
              if ("forwards" === props || "backwards" === props || "unstable_legacy-backwards" === props) {
                if (isArrayImpl(type)) {
                  renderSuspenseListRows(request, task, keyPath, type, props);
                  break a;
                }
                if (newProps = getIteratorFn(type)) {
                  if (newProps = newProps.call(type)) {
                    defaultProps = newProps.next();
                    if (!defaultProps.done) {
                      do
                        defaultProps = newProps.next();
                      while (!defaultProps.done);
                      renderSuspenseListRows(request, task, keyPath, type, props);
                    }
                    break a;
                  }
                }
              }
              "together" === props ? (props = task.keyPath, newProps = task.row, defaultProps = task.row = createSuspenseListRow(null), defaultProps.boundaries = [], defaultProps.together = true, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), 0 === --defaultProps.pendingTasks && finishSuspenseListRow(request, defaultProps), task.keyPath = props, task.row = newProps, null !== newProps && 0 < defaultProps.pendingTasks && (newProps.pendingTasks++, defaultProps.next = newProps)) : (props = task.keyPath, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), task.keyPath = props);
            }
            return;
          case REACT_VIEW_TRANSITION_TYPE:
          case REACT_SCOPE_TYPE:
            throw Error("ReactDOMServer does not yet support scope components.");
          case REACT_SUSPENSE_TYPE:
            a: if (null !== task.replay) {
              type = task.keyPath;
              newProps = task.formatContext;
              defaultProps = task.row;
              task.keyPath = keyPath;
              task.formatContext = getSuspenseContentFormatContext(
                request.resumableState,
                newProps
              );
              task.row = null;
              keyPath = props.children;
              try {
                renderNode(request, task, keyPath, -1);
              } finally {
                task.keyPath = type, task.formatContext = newProps, task.row = defaultProps;
              }
            } else {
              type = task.keyPath;
              ref = task.formatContext;
              var prevRow = task.row, parentBoundary = task.blockedBoundary;
              propName$43 = task.blockedPreamble;
              var parentHoistableState = task.hoistableState;
              propName = task.blockedSegment;
              var fallback = props.fallback;
              props = props.children;
              var fallbackAbortSet = /* @__PURE__ */ new Set();
              var newBoundary = createSuspenseBoundary(
                request,
                task.row,
                fallbackAbortSet,
                null,
                null
              );
              null !== request.trackedPostpones && (newBoundary.trackedContentKeyPath = keyPath);
              var boundarySegment = createPendingSegment(
                request,
                propName.chunks.length,
                newBoundary,
                task.formatContext,
                false,
                false
              );
              propName.children.push(boundarySegment);
              propName.lastPushedText = false;
              var contentRootSegment = createPendingSegment(
                request,
                0,
                null,
                task.formatContext,
                false,
                false
              );
              contentRootSegment.parentFlushed = true;
              if (null !== request.trackedPostpones) {
                newProps = task.componentStack;
                defaultProps = [keyPath[0], "Suspense Fallback", keyPath[2]];
                initialState = [defaultProps[1], defaultProps[2], [], null];
                request.trackedPostpones.workingMap.set(defaultProps, initialState);
                newBoundary.trackedFallbackNode = initialState;
                task.blockedSegment = boundarySegment;
                task.blockedPreamble = newBoundary.fallbackPreamble;
                task.keyPath = defaultProps;
                task.formatContext = getSuspenseFallbackFormatContext(
                  request.resumableState,
                  ref
                );
                task.componentStack = replaceSuspenseComponentStackWithSuspenseFallbackStack(newProps);
                boundarySegment.status = 6;
                try {
                  renderNode(request, task, fallback, -1), pushSegmentFinale(
                    boundarySegment.chunks,
                    request.renderState,
                    boundarySegment.lastPushedText,
                    boundarySegment.textEmbedded
                  ), boundarySegment.status = 1;
                } catch (thrownValue) {
                  throw boundarySegment.status = 12 === request.status ? 3 : 4, thrownValue;
                } finally {
                  task.blockedSegment = propName, task.blockedPreamble = propName$43, task.keyPath = type, task.formatContext = ref;
                }
                task = createRenderTask(
                  request,
                  null,
                  props,
                  -1,
                  newBoundary,
                  contentRootSegment,
                  newBoundary.contentPreamble,
                  newBoundary.contentState,
                  task.abortSet,
                  keyPath,
                  getSuspenseContentFormatContext(
                    request.resumableState,
                    task.formatContext
                  ),
                  task.context,
                  task.treeContext,
                  null,
                  newProps
                );
                pushComponentStack(task);
                request.pingedTasks.push(task);
              } else {
                task.blockedBoundary = newBoundary;
                task.blockedPreamble = newBoundary.contentPreamble;
                task.hoistableState = newBoundary.contentState;
                task.blockedSegment = contentRootSegment;
                task.keyPath = keyPath;
                task.formatContext = getSuspenseContentFormatContext(
                  request.resumableState,
                  ref
                );
                task.row = null;
                contentRootSegment.status = 6;
                try {
                  if (renderNode(request, task, props, -1), pushSegmentFinale(
                    contentRootSegment.chunks,
                    request.renderState,
                    contentRootSegment.lastPushedText,
                    contentRootSegment.textEmbedded
                  ), contentRootSegment.status = 1, queueCompletedSegment(newBoundary, contentRootSegment), 0 === newBoundary.pendingTasks && 0 === newBoundary.status) {
                    if (newBoundary.status = 1, !isEligibleForOutlining(request, newBoundary)) {
                      null !== prevRow && 0 === --prevRow.pendingTasks && finishSuspenseListRow(request, prevRow);
                      0 === request.pendingRootTasks && task.blockedPreamble && preparePreamble(request);
                      break a;
                    }
                  } else
                    null !== prevRow && prevRow.together && tryToResolveTogetherRow(request, prevRow);
                } catch (thrownValue$30) {
                  newBoundary.status = 4, 12 === request.status ? (contentRootSegment.status = 3, newProps = request.fatalError) : (contentRootSegment.status = 4, newProps = thrownValue$30), defaultProps = getThrownInfo(task.componentStack), initialState = logRecoverableError(
                    request,
                    newProps,
                    defaultProps
                  ), newBoundary.errorDigest = initialState, untrackBoundary(request, newBoundary);
                } finally {
                  task.blockedBoundary = parentBoundary, task.blockedPreamble = propName$43, task.hoistableState = parentHoistableState, task.blockedSegment = propName, task.keyPath = type, task.formatContext = ref, task.row = prevRow;
                }
                task = createRenderTask(
                  request,
                  null,
                  fallback,
                  -1,
                  parentBoundary,
                  boundarySegment,
                  newBoundary.fallbackPreamble,
                  newBoundary.fallbackState,
                  fallbackAbortSet,
                  [keyPath[0], "Suspense Fallback", keyPath[2]],
                  getSuspenseFallbackFormatContext(
                    request.resumableState,
                    task.formatContext
                  ),
                  task.context,
                  task.treeContext,
                  task.row,
                  replaceSuspenseComponentStackWithSuspenseFallbackStack(
                    task.componentStack
                  )
                );
                pushComponentStack(task);
                request.pingedTasks.push(task);
              }
            }
            return;
        }
        if ("object" === typeof type && null !== type)
          switch (type.$$typeof) {
            case REACT_FORWARD_REF_TYPE:
              if ("ref" in props)
                for (fallback in newProps = {}, props)
                  "ref" !== fallback && (newProps[fallback] = props[fallback]);
              else newProps = props;
              type = renderWithHooks(
                request,
                task,
                keyPath,
                type.render,
                newProps,
                ref
              );
              finishFunctionComponent(
                request,
                task,
                keyPath,
                type,
                0 !== localIdCounter,
                actionStateCounter,
                actionStateMatchingIndex
              );
              return;
            case REACT_MEMO_TYPE:
              renderElement(request, task, keyPath, type.type, props, ref);
              return;
            case REACT_CONTEXT_TYPE:
              defaultProps = props.children;
              newProps = task.keyPath;
              props = props.value;
              initialState = type._currentValue2;
              type._currentValue2 = props;
              ref = currentActiveSnapshot;
              currentActiveSnapshot = type = {
                parent: ref,
                depth: null === ref ? 0 : ref.depth + 1,
                context: type,
                parentValue: initialState,
                value: props
              };
              task.context = type;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, defaultProps, -1);
              request = currentActiveSnapshot;
              if (null === request)
                throw Error(
                  "Tried to pop a Context at the root of the app. This is a bug in React."
                );
              request.context._currentValue2 = request.parentValue;
              request = currentActiveSnapshot = request.parent;
              task.context = request;
              task.keyPath = newProps;
              return;
            case REACT_CONSUMER_TYPE:
              props = props.children;
              type = props(type._context._currentValue2);
              props = task.keyPath;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, type, -1);
              task.keyPath = props;
              return;
            case REACT_LAZY_TYPE:
              newProps = type._init;
              type = newProps(type._payload);
              if (12 === request.status) throw null;
              renderElement(request, task, keyPath, type, props, ref);
              return;
          }
        throw Error(
          "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + ((null == type ? type : typeof type) + ".")
        );
      }
    }
    function resumeNode(request, task, segmentId, node, childIndex) {
      var prevReplay = task.replay, blockedBoundary = task.blockedBoundary, resumedSegment = createPendingSegment(
        request,
        0,
        null,
        task.formatContext,
        false,
        false
      );
      resumedSegment.id = segmentId;
      resumedSegment.parentFlushed = true;
      try {
        task.replay = null, task.blockedSegment = resumedSegment, renderNode(request, task, node, childIndex), resumedSegment.status = 1, null === blockedBoundary ? request.completedRootSegment = resumedSegment : (queueCompletedSegment(blockedBoundary, resumedSegment), blockedBoundary.parentFlushed && request.partialBoundaries.push(blockedBoundary));
      } finally {
        task.replay = prevReplay, task.blockedSegment = null;
      }
    }
    function renderNodeDestructive(request, task, node, childIndex) {
      null !== task.replay && "number" === typeof task.replay.slots ? resumeNode(request, task, task.replay.slots, node, childIndex) : (task.node = node, task.childIndex = childIndex, node = task.componentStack, pushComponentStack(task), retryNode(request, task), task.componentStack = node);
    }
    function retryNode(request, task) {
      var node = task.node, childIndex = task.childIndex;
      if (null !== node) {
        if ("object" === typeof node) {
          switch (node.$$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = node.type, key = node.key, props = node.props;
              node = props.ref;
              var ref = void 0 !== node ? node : null, name = getComponentNameFromType(type), keyOrIndex = null == key ? -1 === childIndex ? 0 : childIndex : key;
              key = [task.keyPath, name, keyOrIndex];
              if (null !== task.replay)
                a: {
                  var replay = task.replay;
                  childIndex = replay.nodes;
                  for (node = 0; node < childIndex.length; node++) {
                    var node$jscomp$0 = childIndex[node];
                    if (keyOrIndex === node$jscomp$0[1]) {
                      if (4 === node$jscomp$0.length) {
                        if (null !== name && name !== node$jscomp$0[0])
                          throw Error(
                            "Expected the resume to render <" + node$jscomp$0[0] + "> in this slot but instead it rendered <" + name + ">. The tree doesn't match so React will fallback to client rendering."
                          );
                        var childNodes = node$jscomp$0[2];
                        name = node$jscomp$0[3];
                        keyOrIndex = task.node;
                        task.replay = {
                          nodes: childNodes,
                          slots: name,
                          pendingTasks: 1
                        };
                        try {
                          renderElement(request, task, key, type, props, ref);
                          if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                            throw Error(
                              "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                            );
                          task.replay.pendingTasks--;
                        } catch (x) {
                          if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then))
                            throw task.node === keyOrIndex ? task.replay = replay : childIndex.splice(node, 1), x;
                          task.replay.pendingTasks--;
                          props = getThrownInfo(task.componentStack);
                          key = request;
                          request = task.blockedBoundary;
                          type = x;
                          props = logRecoverableError(key, type, props);
                          abortRemainingReplayNodes(
                            key,
                            request,
                            childNodes,
                            name,
                            type,
                            props
                          );
                        }
                        task.replay = replay;
                      } else {
                        if (type !== REACT_SUSPENSE_TYPE)
                          throw Error(
                            "Expected the resume to render <Suspense> in this slot but instead it rendered <" + (getComponentNameFromType(type) || "Unknown") + ">. The tree doesn't match so React will fallback to client rendering."
                          );
                        b: {
                          replay = void 0;
                          type = node$jscomp$0[5];
                          ref = node$jscomp$0[2];
                          name = node$jscomp$0[3];
                          keyOrIndex = null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
                          node$jscomp$0 = null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
                          var prevKeyPath = task.keyPath, prevContext = task.formatContext, prevRow = task.row, previousReplaySet = task.replay, parentBoundary = task.blockedBoundary, parentHoistableState = task.hoistableState, content = props.children, fallback = props.fallback, fallbackAbortSet = /* @__PURE__ */ new Set();
                          props = createSuspenseBoundary(
                            request,
                            task.row,
                            fallbackAbortSet,
                            null,
                            null
                          );
                          props.parentFlushed = true;
                          props.rootSegmentID = type;
                          task.blockedBoundary = props;
                          task.hoistableState = props.contentState;
                          task.keyPath = key;
                          task.formatContext = getSuspenseContentFormatContext(
                            request.resumableState,
                            prevContext
                          );
                          task.row = null;
                          task.replay = {
                            nodes: ref,
                            slots: name,
                            pendingTasks: 1
                          };
                          try {
                            renderNode(request, task, content, -1);
                            if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                              throw Error(
                                "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                              );
                            task.replay.pendingTasks--;
                            if (0 === props.pendingTasks && 0 === props.status) {
                              props.status = 1;
                              request.completedBoundaries.push(props);
                              break b;
                            }
                          } catch (error) {
                            props.status = 4, childNodes = getThrownInfo(task.componentStack), replay = logRecoverableError(
                              request,
                              error,
                              childNodes
                            ), props.errorDigest = replay, task.replay.pendingTasks--, request.clientRenderedBoundaries.push(props);
                          } finally {
                            task.blockedBoundary = parentBoundary, task.hoistableState = parentHoistableState, task.replay = previousReplaySet, task.keyPath = prevKeyPath, task.formatContext = prevContext, task.row = prevRow;
                          }
                          childNodes = createReplayTask(
                            request,
                            null,
                            {
                              nodes: keyOrIndex,
                              slots: node$jscomp$0,
                              pendingTasks: 0
                            },
                            fallback,
                            -1,
                            parentBoundary,
                            props.fallbackState,
                            fallbackAbortSet,
                            [key[0], "Suspense Fallback", key[2]],
                            getSuspenseFallbackFormatContext(
                              request.resumableState,
                              task.formatContext
                            ),
                            task.context,
                            task.treeContext,
                            task.row,
                            replaceSuspenseComponentStackWithSuspenseFallbackStack(
                              task.componentStack
                            )
                          );
                          pushComponentStack(childNodes);
                          request.pingedTasks.push(childNodes);
                        }
                      }
                      childIndex.splice(node, 1);
                      break a;
                    }
                  }
                }
              else renderElement(request, task, key, type, props, ref);
              return;
            case REACT_PORTAL_TYPE:
              throw Error(
                "Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render."
              );
            case REACT_LAZY_TYPE:
              childNodes = node._init;
              node = childNodes(node._payload);
              if (12 === request.status) throw null;
              renderNodeDestructive(request, task, node, childIndex);
              return;
          }
          if (isArrayImpl(node)) {
            renderChildrenArray(request, task, node, childIndex);
            return;
          }
          if (childNodes = getIteratorFn(node)) {
            if (childNodes = childNodes.call(node)) {
              node = childNodes.next();
              if (!node.done) {
                props = [];
                do
                  props.push(node.value), node = childNodes.next();
                while (!node.done);
                renderChildrenArray(request, task, props, childIndex);
              }
              return;
            }
          }
          if ("function" === typeof node.then)
            return task.thenableState = null, renderNodeDestructive(request, task, unwrapThenable(node), childIndex);
          if (node.$$typeof === REACT_CONTEXT_TYPE)
            return renderNodeDestructive(
              request,
              task,
              node._currentValue2,
              childIndex
            );
          childIndex = Object.prototype.toString.call(node);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === childIndex ? "object with keys {" + Object.keys(node).join(", ") + "}" : childIndex) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        if ("string" === typeof node)
          childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            node,
            request.renderState,
            childIndex.lastPushedText
          ));
        else if ("number" === typeof node || "bigint" === typeof node)
          childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            "" + node,
            request.renderState,
            childIndex.lastPushedText
          ));
      }
    }
    function renderChildrenArray(request, task, children, childIndex) {
      var prevKeyPath = task.keyPath;
      if (-1 !== childIndex && (task.keyPath = [task.keyPath, "Fragment", childIndex], null !== task.replay)) {
        for (var replay = task.replay, replayNodes = replay.nodes, j = 0; j < replayNodes.length; j++) {
          var node = replayNodes[j];
          if (node[1] === childIndex) {
            childIndex = node[2];
            node = node[3];
            task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
            try {
              renderChildrenArray(request, task, children, -1);
              if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                throw Error(
                  "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                );
              task.replay.pendingTasks--;
            } catch (x) {
              if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then))
                throw x;
              task.replay.pendingTasks--;
              children = getThrownInfo(task.componentStack);
              var boundary = task.blockedBoundary, error = x;
              children = logRecoverableError(request, error, children);
              abortRemainingReplayNodes(
                request,
                boundary,
                childIndex,
                node,
                error,
                children
              );
            }
            task.replay = replay;
            replayNodes.splice(j, 1);
            break;
          }
        }
        task.keyPath = prevKeyPath;
        return;
      }
      replay = task.treeContext;
      replayNodes = children.length;
      if (null !== task.replay && (j = task.replay.slots, null !== j && "object" === typeof j)) {
        for (childIndex = 0; childIndex < replayNodes; childIndex++)
          node = children[childIndex], task.treeContext = pushTreeContext(replay, replayNodes, childIndex), boundary = j[childIndex], "number" === typeof boundary ? (resumeNode(request, task, boundary, node, childIndex), delete j[childIndex]) : renderNode(request, task, node, childIndex);
        task.treeContext = replay;
        task.keyPath = prevKeyPath;
        return;
      }
      for (j = 0; j < replayNodes; j++)
        childIndex = children[j], task.treeContext = pushTreeContext(replay, replayNodes, j), renderNode(request, task, childIndex, j);
      task.treeContext = replay;
      task.keyPath = prevKeyPath;
    }
    function trackPostponedBoundary(request, trackedPostpones, boundary) {
      boundary.status = 5;
      boundary.rootSegmentID = request.nextSegmentId++;
      request = boundary.trackedContentKeyPath;
      if (null === request)
        throw Error(
          "It should not be possible to postpone at the root. This is a bug in React."
        );
      var fallbackReplayNode = boundary.trackedFallbackNode, children = [], boundaryNode = trackedPostpones.workingMap.get(request);
      if (void 0 === boundaryNode)
        return boundary = [
          request[1],
          request[2],
          children,
          null,
          fallbackReplayNode,
          boundary.rootSegmentID
        ], trackedPostpones.workingMap.set(request, boundary), addToReplayParent(boundary, request[0], trackedPostpones), boundary;
      boundaryNode[4] = fallbackReplayNode;
      boundaryNode[5] = boundary.rootSegmentID;
      return boundaryNode;
    }
    function trackPostpone(request, trackedPostpones, task, segment) {
      segment.status = 5;
      var keyPath = task.keyPath, boundary = task.blockedBoundary;
      if (null === boundary)
        segment.id = request.nextSegmentId++, trackedPostpones.rootSlots = segment.id, null !== request.completedRootSegment && (request.completedRootSegment.status = 5);
      else {
        if (null !== boundary && 0 === boundary.status) {
          var boundaryNode = trackPostponedBoundary(
            request,
            trackedPostpones,
            boundary
          );
          if (boundary.trackedContentKeyPath === keyPath && -1 === task.childIndex) {
            -1 === segment.id && (segment.id = segment.parentFlushed ? boundary.rootSegmentID : request.nextSegmentId++);
            boundaryNode[3] = segment.id;
            return;
          }
        }
        -1 === segment.id && (segment.id = segment.parentFlushed && null !== boundary ? boundary.rootSegmentID : request.nextSegmentId++);
        if (-1 === task.childIndex)
          null === keyPath ? trackedPostpones.rootSlots = segment.id : (task = trackedPostpones.workingMap.get(keyPath), void 0 === task ? (task = [keyPath[1], keyPath[2], [], segment.id], addToReplayParent(task, keyPath[0], trackedPostpones)) : task[3] = segment.id);
        else {
          if (null === keyPath)
            if (request = trackedPostpones.rootSlots, null === request)
              request = trackedPostpones.rootSlots = {};
            else {
              if ("number" === typeof request)
                throw Error(
                  "It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React."
                );
            }
          else if (boundary = trackedPostpones.workingMap, boundaryNode = boundary.get(keyPath), void 0 === boundaryNode)
            request = {}, boundaryNode = [keyPath[1], keyPath[2], [], request], boundary.set(keyPath, boundaryNode), addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
          else if (request = boundaryNode[3], null === request)
            request = boundaryNode[3] = {};
          else if ("number" === typeof request)
            throw Error(
              "It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React."
            );
          request[task.childIndex] = segment.id;
        }
      }
    }
    function untrackBoundary(request, boundary) {
      request = request.trackedPostpones;
      null !== request && (boundary = boundary.trackedContentKeyPath, null !== boundary && (boundary = request.workingMap.get(boundary), void 0 !== boundary && (boundary.length = 4, boundary[2] = [], boundary[3] = null)));
    }
    function spawnNewSuspendedReplayTask(request, task, thenableState2) {
      return createReplayTask(
        request,
        thenableState2,
        task.replay,
        task.node,
        task.childIndex,
        task.blockedBoundary,
        task.hoistableState,
        task.abortSet,
        task.keyPath,
        task.formatContext,
        task.context,
        task.treeContext,
        task.row,
        task.componentStack
      );
    }
    function spawnNewSuspendedRenderTask(request, task, thenableState2) {
      var segment = task.blockedSegment, newSegment = createPendingSegment(
        request,
        segment.chunks.length,
        null,
        task.formatContext,
        segment.lastPushedText,
        true
      );
      segment.children.push(newSegment);
      segment.lastPushedText = false;
      return createRenderTask(
        request,
        thenableState2,
        task.node,
        task.childIndex,
        task.blockedBoundary,
        newSegment,
        task.blockedPreamble,
        task.hoistableState,
        task.abortSet,
        task.keyPath,
        task.formatContext,
        task.context,
        task.treeContext,
        task.row,
        task.componentStack
      );
    }
    function renderNode(request, task, node, childIndex) {
      var previousFormatContext = task.formatContext, previousContext = task.context, previousKeyPath = task.keyPath, previousTreeContext = task.treeContext, previousComponentStack = task.componentStack, segment = task.blockedSegment;
      if (null === segment) {
        segment = task.replay;
        try {
          return renderNodeDestructive(request, task, node, childIndex);
        } catch (thrownValue) {
          if (resetHooksState(), node = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue, 12 !== request.status && "object" === typeof node && null !== node) {
            if ("function" === typeof node.then) {
              childIndex = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
              request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
              node.then(request, request);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              switchContext(previousContext);
              return;
            }
            if ("Maximum call stack size exceeded" === node.message) {
              node = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
              node = spawnNewSuspendedReplayTask(request, task, node);
              request.pingedTasks.push(node);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              switchContext(previousContext);
              return;
            }
          }
        }
      } else {
        var childrenLength = segment.children.length, chunkLength = segment.chunks.length;
        try {
          return renderNodeDestructive(request, task, node, childIndex);
        } catch (thrownValue$62) {
          if (resetHooksState(), segment.children.length = childrenLength, segment.chunks.length = chunkLength, node = thrownValue$62 === SuspenseException ? getSuspendedThenable() : thrownValue$62, 12 !== request.status && "object" === typeof node && null !== node) {
            if ("function" === typeof node.then) {
              segment = node;
              node = thrownValue$62 === SuspenseException ? getThenableStateAfterSuspending() : null;
              request = spawnNewSuspendedRenderTask(request, task, node).ping;
              segment.then(request, request);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              switchContext(previousContext);
              return;
            }
            if ("Maximum call stack size exceeded" === node.message) {
              segment = thrownValue$62 === SuspenseException ? getThenableStateAfterSuspending() : null;
              segment = spawnNewSuspendedRenderTask(request, task, segment);
              request.pingedTasks.push(segment);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              switchContext(previousContext);
              return;
            }
          }
        }
      }
      task.formatContext = previousFormatContext;
      task.context = previousContext;
      task.keyPath = previousKeyPath;
      task.treeContext = previousTreeContext;
      switchContext(previousContext);
      throw node;
    }
    function abortTaskSoft(task) {
      var boundary = task.blockedBoundary, segment = task.blockedSegment;
      null !== segment && (segment.status = 3, finishedTask(this, boundary, task.row, segment));
    }
    function abortRemainingReplayNodes(request$jscomp$0, boundary, nodes, slots, error, errorDigest$jscomp$0) {
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (4 === node.length)
          abortRemainingReplayNodes(
            request$jscomp$0,
            boundary,
            node[2],
            node[3],
            error,
            errorDigest$jscomp$0
          );
        else {
          node = node[5];
          var request = request$jscomp$0, errorDigest = errorDigest$jscomp$0, resumedBoundary = createSuspenseBoundary(
            request,
            null,
            /* @__PURE__ */ new Set(),
            null,
            null
          );
          resumedBoundary.parentFlushed = true;
          resumedBoundary.rootSegmentID = node;
          resumedBoundary.status = 4;
          resumedBoundary.errorDigest = errorDigest;
          resumedBoundary.parentFlushed && request.clientRenderedBoundaries.push(resumedBoundary);
        }
      }
      nodes.length = 0;
      if (null !== slots) {
        if (null === boundary)
          throw Error(
            "We should not have any resumable nodes in the shell. This is a bug in React."
          );
        4 !== boundary.status && (boundary.status = 4, boundary.errorDigest = errorDigest$jscomp$0, boundary.parentFlushed && request$jscomp$0.clientRenderedBoundaries.push(boundary));
        if ("object" === typeof slots) for (var index in slots) delete slots[index];
      }
    }
    function abortTask(task, request, error) {
      var boundary = task.blockedBoundary, segment = task.blockedSegment;
      if (null !== segment) {
        if (6 === segment.status) return;
        segment.status = 3;
      }
      var errorInfo = getThrownInfo(task.componentStack);
      if (null === boundary) {
        if (13 !== request.status && 14 !== request.status) {
          boundary = task.replay;
          if (null === boundary) {
            null !== request.trackedPostpones && null !== segment ? (boundary = request.trackedPostpones, logRecoverableError(request, error, errorInfo), trackPostpone(request, boundary, task, segment), finishedTask(request, null, task.row, segment)) : (logRecoverableError(request, error, errorInfo), fatalError(request, error));
            return;
          }
          boundary.pendingTasks--;
          0 === boundary.pendingTasks && 0 < boundary.nodes.length && (segment = logRecoverableError(request, error, errorInfo), abortRemainingReplayNodes(
            request,
            null,
            boundary.nodes,
            boundary.slots,
            error,
            segment
          ));
          request.pendingRootTasks--;
          0 === request.pendingRootTasks && completeShell(request);
        }
      } else {
        var trackedPostpones$63 = request.trackedPostpones;
        if (4 !== boundary.status) {
          if (null !== trackedPostpones$63 && null !== segment)
            return logRecoverableError(request, error, errorInfo), trackPostpone(request, trackedPostpones$63, task, segment), boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
              return abortTask(fallbackTask, request, error);
            }), boundary.fallbackAbortableTasks.clear(), finishedTask(request, boundary, task.row, segment);
          boundary.status = 4;
          segment = logRecoverableError(request, error, errorInfo);
          boundary.status = 4;
          boundary.errorDigest = segment;
          untrackBoundary(request, boundary);
          boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
        }
        boundary.pendingTasks--;
        segment = boundary.row;
        null !== segment && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
        boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
          return abortTask(fallbackTask, request, error);
        });
        boundary.fallbackAbortableTasks.clear();
      }
      task = task.row;
      null !== task && 0 === --task.pendingTasks && finishSuspenseListRow(request, task);
      request.allPendingTasks--;
      0 === request.allPendingTasks && completeAll(request);
    }
    function safelyEmitEarlyPreloads(request, shellComplete) {
      try {
        var renderState = request.renderState, onHeaders = renderState.onHeaders;
        if (onHeaders) {
          var headers = renderState.headers;
          if (headers) {
            renderState.headers = null;
            var linkHeader = headers.preconnects;
            headers.fontPreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.fontPreloads);
            headers.highImagePreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.highImagePreloads);
            if (!shellComplete) {
              var queueIter = renderState.styles.values(), queueStep = queueIter.next();
              b: for (; 0 < headers.remainingCapacity && !queueStep.done; queueStep = queueIter.next())
                for (var sheetIter = queueStep.value.sheets.values(), sheetStep = sheetIter.next(); 0 < headers.remainingCapacity && !sheetStep.done; sheetStep = sheetIter.next()) {
                  var sheet = sheetStep.value, props = sheet.props, key = props.href, props$jscomp$0 = sheet.props, header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                    crossOrigin: props$jscomp$0.crossOrigin,
                    integrity: props$jscomp$0.integrity,
                    nonce: props$jscomp$0.nonce,
                    type: props$jscomp$0.type,
                    fetchPriority: props$jscomp$0.fetchPriority,
                    referrerPolicy: props$jscomp$0.referrerPolicy,
                    media: props$jscomp$0.media
                  });
                  if (0 <= (headers.remainingCapacity -= header.length + 2))
                    renderState.resets.style[key] = PRELOAD_NO_CREDS, linkHeader && (linkHeader += ", "), linkHeader += header, renderState.resets.style[key] = "string" === typeof props.crossOrigin || "string" === typeof props.integrity ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
                  else break b;
                }
            }
            linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
          }
        }
      } catch (error) {
        logRecoverableError(request, error, {});
      }
    }
    function completeShell(request) {
      null === request.trackedPostpones && safelyEmitEarlyPreloads(request, true);
      null === request.trackedPostpones && preparePreamble(request);
      request.onShellError = noop;
      request = request.onShellReady;
      request();
    }
    function completeAll(request) {
      safelyEmitEarlyPreloads(
        request,
        null === request.trackedPostpones ? true : null === request.completedRootSegment || 5 !== request.completedRootSegment.status
      );
      preparePreamble(request);
      request = request.onAllReady;
      request();
    }
    function queueCompletedSegment(boundary, segment) {
      if (0 === segment.chunks.length && 1 === segment.children.length && null === segment.children[0].boundary && -1 === segment.children[0].id) {
        var childSegment = segment.children[0];
        childSegment.id = segment.id;
        childSegment.parentFlushed = true;
        1 !== childSegment.status && 3 !== childSegment.status && 4 !== childSegment.status || queueCompletedSegment(boundary, childSegment);
      } else boundary.completedSegments.push(segment);
    }
    function finishedTask(request, boundary, row, segment) {
      null !== row && (0 === --row.pendingTasks ? finishSuspenseListRow(request, row) : row.together && tryToResolveTogetherRow(request, row));
      request.allPendingTasks--;
      if (null === boundary) {
        if (null !== segment && segment.parentFlushed) {
          if (null !== request.completedRootSegment)
            throw Error(
              "There can only be one root segment. This is a bug in React."
            );
          request.completedRootSegment = segment;
        }
        request.pendingRootTasks--;
        0 === request.pendingRootTasks && completeShell(request);
      } else if (boundary.pendingTasks--, 4 !== boundary.status)
        if (0 === boundary.pendingTasks)
          if (0 === boundary.status && (boundary.status = 1), null !== segment && segment.parentFlushed && (1 === segment.status || 3 === segment.status) && queueCompletedSegment(boundary, segment), boundary.parentFlushed && request.completedBoundaries.push(boundary), 1 === boundary.status)
            row = boundary.row, null !== row && hoistHoistables(row.hoistables, boundary.contentState), isEligibleForOutlining(request, boundary) || (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request), boundary.fallbackAbortableTasks.clear(), null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row)), 0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary.contentPreamble && preparePreamble(request);
          else {
            if (5 === boundary.status && (boundary = boundary.row, null !== boundary)) {
              if (null !== request.trackedPostpones) {
                row = request.trackedPostpones;
                var postponedRow = boundary.next;
                if (null !== postponedRow && (segment = postponedRow.boundaries, null !== segment))
                  for (postponedRow.boundaries = null, postponedRow = 0; postponedRow < segment.length; postponedRow++) {
                    var postponedBoundary = segment[postponedRow];
                    trackPostponedBoundary(request, row, postponedBoundary);
                    finishedTask(request, postponedBoundary, null, null);
                  }
              }
              0 === --boundary.pendingTasks && finishSuspenseListRow(request, boundary);
            }
          }
        else
          null === segment || !segment.parentFlushed || 1 !== segment.status && 3 !== segment.status || (queueCompletedSegment(boundary, segment), 1 === boundary.completedSegments.length && boundary.parentFlushed && request.partialBoundaries.push(boundary)), boundary = boundary.row, null !== boundary && boundary.together && tryToResolveTogetherRow(request, boundary);
      0 === request.allPendingTasks && completeAll(request);
    }
    function performWork(request$jscomp$2) {
      if (14 !== request$jscomp$2.status && 13 !== request$jscomp$2.status) {
        var prevContext = currentActiveSnapshot, prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = HooksDispatcher;
        var prevAsyncDispatcher = ReactSharedInternals.A;
        ReactSharedInternals.A = DefaultAsyncDispatcher;
        var prevRequest = currentRequest;
        currentRequest = request$jscomp$2;
        var prevResumableState = currentResumableState;
        currentResumableState = request$jscomp$2.resumableState;
        try {
          var pingedTasks = request$jscomp$2.pingedTasks, i;
          for (i = 0; i < pingedTasks.length; i++) {
            var task = pingedTasks[i], request = request$jscomp$2, segment = task.blockedSegment;
            if (null === segment) {
              var request$jscomp$0 = request;
              if (0 !== task.replay.pendingTasks) {
                switchContext(task.context);
                try {
                  "number" === typeof task.replay.slots ? resumeNode(
                    request$jscomp$0,
                    task,
                    task.replay.slots,
                    task.node,
                    task.childIndex
                  ) : retryNode(request$jscomp$0, task);
                  if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                    throw Error(
                      "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                    );
                  task.replay.pendingTasks--;
                  task.abortSet.delete(task);
                  finishedTask(
                    request$jscomp$0,
                    task.blockedBoundary,
                    task.row,
                    null
                  );
                } catch (thrownValue) {
                  resetHooksState();
                  var x = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
                  if ("object" === typeof x && null !== x && "function" === typeof x.then) {
                    var ping = task.ping;
                    x.then(ping, ping);
                    task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                  } else {
                    task.replay.pendingTasks--;
                    task.abortSet.delete(task);
                    var errorInfo = getThrownInfo(task.componentStack);
                    request = void 0;
                    var request$jscomp$1 = request$jscomp$0, boundary = task.blockedBoundary, error$jscomp$0 = 12 === request$jscomp$0.status ? request$jscomp$0.fatalError : x, replayNodes = task.replay.nodes, resumeSlots = task.replay.slots;
                    request = logRecoverableError(
                      request$jscomp$1,
                      error$jscomp$0,
                      errorInfo
                    );
                    abortRemainingReplayNodes(
                      request$jscomp$1,
                      boundary,
                      replayNodes,
                      resumeSlots,
                      error$jscomp$0,
                      request
                    );
                    request$jscomp$0.pendingRootTasks--;
                    0 === request$jscomp$0.pendingRootTasks && completeShell(request$jscomp$0);
                    request$jscomp$0.allPendingTasks--;
                    0 === request$jscomp$0.allPendingTasks && completeAll(request$jscomp$0);
                  }
                } finally {
                }
              }
            } else if (request$jscomp$0 = void 0, request$jscomp$1 = segment, 0 === request$jscomp$1.status) {
              request$jscomp$1.status = 6;
              switchContext(task.context);
              var childrenLength = request$jscomp$1.children.length, chunkLength = request$jscomp$1.chunks.length;
              try {
                retryNode(request, task), pushSegmentFinale(
                  request$jscomp$1.chunks,
                  request.renderState,
                  request$jscomp$1.lastPushedText,
                  request$jscomp$1.textEmbedded
                ), task.abortSet.delete(task), request$jscomp$1.status = 1, finishedTask(
                  request,
                  task.blockedBoundary,
                  task.row,
                  request$jscomp$1
                );
              } catch (thrownValue) {
                resetHooksState();
                request$jscomp$1.children.length = childrenLength;
                request$jscomp$1.chunks.length = chunkLength;
                var x$jscomp$0 = thrownValue === SuspenseException ? getSuspendedThenable() : 12 === request.status ? request.fatalError : thrownValue;
                if (12 === request.status && null !== request.trackedPostpones) {
                  var trackedPostpones = request.trackedPostpones, thrownInfo = getThrownInfo(task.componentStack);
                  task.abortSet.delete(task);
                  logRecoverableError(request, x$jscomp$0, thrownInfo);
                  trackPostpone(request, trackedPostpones, task, request$jscomp$1);
                  finishedTask(
                    request,
                    task.blockedBoundary,
                    task.row,
                    request$jscomp$1
                  );
                } else if ("object" === typeof x$jscomp$0 && null !== x$jscomp$0 && "function" === typeof x$jscomp$0.then) {
                  request$jscomp$1.status = 0;
                  task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                  var ping$jscomp$0 = task.ping;
                  x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
                } else {
                  var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
                  task.abortSet.delete(task);
                  request$jscomp$1.status = 4;
                  var boundary$jscomp$0 = task.blockedBoundary, row = task.row;
                  null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
                  request.allPendingTasks--;
                  request$jscomp$0 = logRecoverableError(
                    request,
                    x$jscomp$0,
                    errorInfo$jscomp$0
                  );
                  if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
                  else if (boundary$jscomp$0.pendingTasks--, 4 !== boundary$jscomp$0.status) {
                    boundary$jscomp$0.status = 4;
                    boundary$jscomp$0.errorDigest = request$jscomp$0;
                    untrackBoundary(request, boundary$jscomp$0);
                    var boundaryRow = boundary$jscomp$0.row;
                    null !== boundaryRow && 0 === --boundaryRow.pendingTasks && finishSuspenseListRow(request, boundaryRow);
                    boundary$jscomp$0.parentFlushed && request.clientRenderedBoundaries.push(boundary$jscomp$0);
                    0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary$jscomp$0.contentPreamble && preparePreamble(request);
                  }
                  0 === request.allPendingTasks && completeAll(request);
                }
              } finally {
              }
            }
          }
          pingedTasks.splice(0, i);
          null !== request$jscomp$2.destination && flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
        } catch (error) {
          logRecoverableError(request$jscomp$2, error, {}), fatalError(request$jscomp$2, error);
        } finally {
          currentResumableState = prevResumableState, ReactSharedInternals.H = prevDispatcher, ReactSharedInternals.A = prevAsyncDispatcher, prevDispatcher === HooksDispatcher && switchContext(prevContext), currentRequest = prevRequest;
        }
      }
    }
    function preparePreambleFromSubtree(request, segment, collectedPreambleSegments) {
      segment.preambleChildren.length && collectedPreambleSegments.push(segment.preambleChildren);
      for (var pendingPreambles = false, i = 0; i < segment.children.length; i++)
        pendingPreambles = preparePreambleFromSegment(
          request,
          segment.children[i],
          collectedPreambleSegments
        ) || pendingPreambles;
      return pendingPreambles;
    }
    function preparePreambleFromSegment(request, segment, collectedPreambleSegments) {
      var boundary = segment.boundary;
      if (null === boundary)
        return preparePreambleFromSubtree(
          request,
          segment,
          collectedPreambleSegments
        );
      var preamble = boundary.contentPreamble, fallbackPreamble = boundary.fallbackPreamble;
      if (null === preamble || null === fallbackPreamble) return false;
      switch (boundary.status) {
        case 1:
          hoistPreambleState(request.renderState, preamble);
          request.byteSize += boundary.byteSize;
          segment = boundary.completedSegments[0];
          if (!segment)
            throw Error(
              "A previously unvisited boundary must have exactly one root segment. This is a bug in React."
            );
          return preparePreambleFromSubtree(
            request,
            segment,
            collectedPreambleSegments
          );
        case 5:
          if (null !== request.trackedPostpones) return true;
        case 4:
          if (1 === segment.status)
            return hoistPreambleState(request.renderState, fallbackPreamble), preparePreambleFromSubtree(
              request,
              segment,
              collectedPreambleSegments
            );
        default:
          return true;
      }
    }
    function preparePreamble(request) {
      if (request.completedRootSegment && null === request.completedPreambleSegments) {
        var collectedPreambleSegments = [], originalRequestByteSize = request.byteSize, hasPendingPreambles = preparePreambleFromSegment(
          request,
          request.completedRootSegment,
          collectedPreambleSegments
        ), preamble = request.renderState.preamble;
        false === hasPendingPreambles || preamble.headChunks && preamble.bodyChunks ? request.completedPreambleSegments = collectedPreambleSegments : request.byteSize = originalRequestByteSize;
      }
    }
    function flushSubtree(request, destination, segment, hoistableState) {
      segment.parentFlushed = true;
      switch (segment.status) {
        case 0:
          segment.id = request.nextSegmentId++;
        case 5:
          return hoistableState = segment.id, segment.lastPushedText = false, segment.textEmbedded = false, request = request.renderState, destination.push('<template id="'), destination.push(request.placeholderPrefix), request = hoistableState.toString(16), destination.push(request), destination.push('"></template>');
        case 1:
          segment.status = 2;
          var r = true, chunks = segment.chunks, chunkIdx = 0;
          segment = segment.children;
          for (var childIdx = 0; childIdx < segment.length; childIdx++) {
            for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++)
              destination.push(chunks[chunkIdx]);
            r = flushSegment(request, destination, r, hoistableState);
          }
          for (; chunkIdx < chunks.length - 1; chunkIdx++)
            destination.push(chunks[chunkIdx]);
          chunkIdx < chunks.length && (r = destination.push(chunks[chunkIdx]));
          return r;
        case 3:
          return true;
        default:
          throw Error(
            "Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React."
          );
      }
    }
    var flushedByteSize = 0;
    function flushSegment(request, destination, segment, hoistableState) {
      var boundary = segment.boundary;
      if (null === boundary)
        return flushSubtree(request, destination, segment, hoistableState);
      boundary.parentFlushed = true;
      if (4 === boundary.status) {
        var row = boundary.row;
        null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
        request.renderState.generateStaticMarkup || (boundary = boundary.errorDigest, destination.push("<!--$!-->"), destination.push("<template"), boundary && (destination.push(' data-dgst="'), boundary = escapeTextForBrowser(boundary), destination.push(boundary), destination.push('"')), destination.push("></template>"));
        flushSubtree(request, destination, segment, hoistableState);
        request = request.renderState.generateStaticMarkup ? true : destination.push("<!--/$-->");
        return request;
      }
      if (1 !== boundary.status)
        return 0 === boundary.status && (boundary.rootSegmentID = request.nextSegmentId++), 0 < boundary.completedSegments.length && request.partialBoundaries.push(boundary), writeStartPendingSuspenseBoundary(
          destination,
          request.renderState,
          boundary.rootSegmentID
        ), hoistableState && hoistHoistables(hoistableState, boundary.fallbackState), flushSubtree(request, destination, segment, hoistableState), destination.push("<!--/$-->");
      if (!flushingPartialBoundaries && isEligibleForOutlining(request, boundary) && flushedByteSize + boundary.byteSize > request.progressiveChunkSize)
        return boundary.rootSegmentID = request.nextSegmentId++, request.completedBoundaries.push(boundary), writeStartPendingSuspenseBoundary(
          destination,
          request.renderState,
          boundary.rootSegmentID
        ), flushSubtree(request, destination, segment, hoistableState), destination.push("<!--/$-->");
      flushedByteSize += boundary.byteSize;
      hoistableState && hoistHoistables(hoistableState, boundary.contentState);
      segment = boundary.row;
      null !== segment && isEligibleForOutlining(request, boundary) && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
      request.renderState.generateStaticMarkup || destination.push("<!--$-->");
      segment = boundary.completedSegments;
      if (1 !== segment.length)
        throw Error(
          "A previously unvisited boundary must have exactly one root segment. This is a bug in React."
        );
      flushSegment(request, destination, segment[0], hoistableState);
      request = request.renderState.generateStaticMarkup ? true : destination.push("<!--/$-->");
      return request;
    }
    function flushSegmentContainer(request, destination, segment, hoistableState) {
      writeStartSegment(
        destination,
        request.renderState,
        segment.parentFormatContext,
        segment.id
      );
      flushSegment(request, destination, segment, hoistableState);
      return writeEndSegment(destination, segment.parentFormatContext);
    }
    function flushCompletedBoundary(request, destination, boundary) {
      flushedByteSize = boundary.byteSize;
      for (var completedSegments = boundary.completedSegments, i = 0; i < completedSegments.length; i++)
        flushPartiallyCompletedSegment(
          request,
          destination,
          boundary,
          completedSegments[i]
        );
      completedSegments.length = 0;
      completedSegments = boundary.row;
      null !== completedSegments && isEligibleForOutlining(request, boundary) && 0 === --completedSegments.pendingTasks && finishSuspenseListRow(request, completedSegments);
      writeHoistablesForBoundary(
        destination,
        boundary.contentState,
        request.renderState
      );
      completedSegments = request.resumableState;
      request = request.renderState;
      i = boundary.rootSegmentID;
      boundary = boundary.contentState;
      var requiresStyleInsertion = request.stylesToHoist;
      request.stylesToHoist = false;
      destination.push(request.startInlineScript);
      destination.push(">");
      requiresStyleInsertion ? (0 === (completedSegments.instructions & 4) && (completedSegments.instructions |= 4, destination.push(
        '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};'
      )), 0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, destination.push(
        '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
      )), 0 === (completedSegments.instructions & 8) ? (completedSegments.instructions |= 8, destination.push(
        '$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=\n"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("'
      )) : destination.push('$RR("')) : (0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, destination.push(
        '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
      )), destination.push('$RC("'));
      completedSegments = i.toString(16);
      destination.push(request.boundaryPrefix);
      destination.push(completedSegments);
      destination.push('","');
      destination.push(request.segmentPrefix);
      destination.push(completedSegments);
      requiresStyleInsertion ? (destination.push('",'), writeStyleResourceDependenciesInJS(destination, boundary)) : destination.push('"');
      boundary = destination.push(")</script>");
      return writeBootstrap(destination, request) && boundary;
    }
    function flushPartiallyCompletedSegment(request, destination, boundary, segment) {
      if (2 === segment.status) return true;
      var hoistableState = boundary.contentState, segmentID = segment.id;
      if (-1 === segmentID) {
        if (-1 === (segment.id = boundary.rootSegmentID))
          throw Error(
            "A root segment ID must have been assigned by now. This is a bug in React."
          );
        return flushSegmentContainer(request, destination, segment, hoistableState);
      }
      if (segmentID === boundary.rootSegmentID)
        return flushSegmentContainer(request, destination, segment, hoistableState);
      flushSegmentContainer(request, destination, segment, hoistableState);
      boundary = request.resumableState;
      request = request.renderState;
      destination.push(request.startInlineScript);
      destination.push(">");
      0 === (boundary.instructions & 1) ? (boundary.instructions |= 1, destination.push(
        '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("'
      )) : destination.push('$RS("');
      destination.push(request.segmentPrefix);
      segmentID = segmentID.toString(16);
      destination.push(segmentID);
      destination.push('","');
      destination.push(request.placeholderPrefix);
      destination.push(segmentID);
      destination = destination.push('")</script>');
      return destination;
    }
    var flushingPartialBoundaries = false;
    function flushCompletedQueues(request, destination) {
      try {
        if (!(0 < request.pendingRootTasks)) {
          var i, completedRootSegment = request.completedRootSegment;
          if (null !== completedRootSegment) {
            if (5 === completedRootSegment.status) return;
            var completedPreambleSegments = request.completedPreambleSegments;
            if (null === completedPreambleSegments) return;
            flushedByteSize = request.byteSize;
            var resumableState = request.resumableState, renderState = request.renderState, preamble = renderState.preamble, htmlChunks = preamble.htmlChunks, headChunks = preamble.headChunks, i$jscomp$0;
            if (htmlChunks) {
              for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
                destination.push(htmlChunks[i$jscomp$0]);
              if (headChunks)
                for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
                  destination.push(headChunks[i$jscomp$0]);
              else {
                var chunk = startChunkForTag("head");
                destination.push(chunk);
                destination.push(">");
              }
            } else if (headChunks)
              for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
                destination.push(headChunks[i$jscomp$0]);
            var charsetChunks = renderState.charsetChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
              destination.push(charsetChunks[i$jscomp$0]);
            charsetChunks.length = 0;
            renderState.preconnects.forEach(flushResource, destination);
            renderState.preconnects.clear();
            var viewportChunks = renderState.viewportChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
              destination.push(viewportChunks[i$jscomp$0]);
            viewportChunks.length = 0;
            renderState.fontPreloads.forEach(flushResource, destination);
            renderState.fontPreloads.clear();
            renderState.highImagePreloads.forEach(flushResource, destination);
            renderState.highImagePreloads.clear();
            currentlyFlushingRenderState = renderState;
            renderState.styles.forEach(flushStylesInPreamble, destination);
            currentlyFlushingRenderState = null;
            var importMapChunks = renderState.importMapChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
              destination.push(importMapChunks[i$jscomp$0]);
            importMapChunks.length = 0;
            renderState.bootstrapScripts.forEach(flushResource, destination);
            renderState.scripts.forEach(flushResource, destination);
            renderState.scripts.clear();
            renderState.bulkPreloads.forEach(flushResource, destination);
            renderState.bulkPreloads.clear();
            resumableState.instructions |= 32;
            var hoistableChunks = renderState.hoistableChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
              destination.push(hoistableChunks[i$jscomp$0]);
            for (resumableState = hoistableChunks.length = 0; resumableState < completedPreambleSegments.length; resumableState++) {
              var segments = completedPreambleSegments[resumableState];
              for (renderState = 0; renderState < segments.length; renderState++)
                flushSegment(request, destination, segments[renderState], null);
            }
            var preamble$jscomp$0 = request.renderState.preamble, headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
            if (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) {
              var chunk$jscomp$0 = endChunkForTag("head");
              destination.push(chunk$jscomp$0);
            }
            var bodyChunks = preamble$jscomp$0.bodyChunks;
            if (bodyChunks)
              for (completedPreambleSegments = 0; completedPreambleSegments < bodyChunks.length; completedPreambleSegments++)
                destination.push(bodyChunks[completedPreambleSegments]);
            flushSegment(request, destination, completedRootSegment, null);
            request.completedRootSegment = null;
            var renderState$jscomp$0 = request.renderState;
            if (0 !== request.allPendingTasks || 0 !== request.clientRenderedBoundaries.length || 0 !== request.completedBoundaries.length || null !== request.trackedPostpones && (0 !== request.trackedPostpones.rootNodes.length || null !== request.trackedPostpones.rootSlots)) {
              var resumableState$jscomp$0 = request.resumableState;
              if (0 === (resumableState$jscomp$0.instructions & 64)) {
                resumableState$jscomp$0.instructions |= 64;
                destination.push(renderState$jscomp$0.startInlineScript);
                if (0 === (resumableState$jscomp$0.instructions & 32)) {
                  resumableState$jscomp$0.instructions |= 32;
                  var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
                  destination.push(' id="');
                  var chunk$jscomp$1 = escapeTextForBrowser(shellId);
                  destination.push(chunk$jscomp$1);
                  destination.push('"');
                }
                destination.push(">");
                destination.push(
                  "requestAnimationFrame(function(){$RT=performance.now()});"
                );
                destination.push("</script>");
              }
            }
            writeBootstrap(destination, renderState$jscomp$0);
          }
          var renderState$jscomp$1 = request.renderState;
          completedRootSegment = 0;
          var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
          for (completedRootSegment = 0; completedRootSegment < viewportChunks$jscomp$0.length; completedRootSegment++)
            destination.push(viewportChunks$jscomp$0[completedRootSegment]);
          viewportChunks$jscomp$0.length = 0;
          renderState$jscomp$1.preconnects.forEach(flushResource, destination);
          renderState$jscomp$1.preconnects.clear();
          renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
          renderState$jscomp$1.fontPreloads.clear();
          renderState$jscomp$1.highImagePreloads.forEach(
            flushResource,
            destination
          );
          renderState$jscomp$1.highImagePreloads.clear();
          renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
          renderState$jscomp$1.scripts.forEach(flushResource, destination);
          renderState$jscomp$1.scripts.clear();
          renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
          renderState$jscomp$1.bulkPreloads.clear();
          var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
          for (completedRootSegment = 0; completedRootSegment < hoistableChunks$jscomp$0.length; completedRootSegment++)
            destination.push(hoistableChunks$jscomp$0[completedRootSegment]);
          hoistableChunks$jscomp$0.length = 0;
          var clientRenderedBoundaries = request.clientRenderedBoundaries;
          for (i = 0; i < clientRenderedBoundaries.length; i++) {
            var boundary = clientRenderedBoundaries[i];
            renderState$jscomp$1 = destination;
            var resumableState$jscomp$1 = request.resumableState, renderState$jscomp$2 = request.renderState, id = boundary.rootSegmentID, errorDigest = boundary.errorDigest;
            renderState$jscomp$1.push(renderState$jscomp$2.startInlineScript);
            renderState$jscomp$1.push(">");
            0 === (resumableState$jscomp$1.instructions & 4) ? (resumableState$jscomp$1.instructions |= 4, renderState$jscomp$1.push(
              '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("'
            )) : renderState$jscomp$1.push('$RX("');
            renderState$jscomp$1.push(renderState$jscomp$2.boundaryPrefix);
            var chunk$jscomp$2 = id.toString(16);
            renderState$jscomp$1.push(chunk$jscomp$2);
            renderState$jscomp$1.push('"');
            if (errorDigest) {
              renderState$jscomp$1.push(",");
              var chunk$jscomp$3 = escapeJSStringsForInstructionScripts(
                errorDigest || ""
              );
              renderState$jscomp$1.push(chunk$jscomp$3);
            }
            var JSCompiler_inline_result = renderState$jscomp$1.push(")</script>");
            if (!JSCompiler_inline_result) {
              request.destination = null;
              i++;
              clientRenderedBoundaries.splice(0, i);
              return;
            }
          }
          clientRenderedBoundaries.splice(0, i);
          var completedBoundaries = request.completedBoundaries;
          for (i = 0; i < completedBoundaries.length; i++)
            if (!flushCompletedBoundary(request, destination, completedBoundaries[i])) {
              request.destination = null;
              i++;
              completedBoundaries.splice(0, i);
              return;
            }
          completedBoundaries.splice(0, i);
          flushingPartialBoundaries = true;
          var partialBoundaries = request.partialBoundaries;
          for (i = 0; i < partialBoundaries.length; i++) {
            var boundary$69 = partialBoundaries[i];
            a: {
              clientRenderedBoundaries = request;
              boundary = destination;
              flushedByteSize = boundary$69.byteSize;
              var completedSegments = boundary$69.completedSegments;
              for (JSCompiler_inline_result = 0; JSCompiler_inline_result < completedSegments.length; JSCompiler_inline_result++)
                if (!flushPartiallyCompletedSegment(
                  clientRenderedBoundaries,
                  boundary,
                  boundary$69,
                  completedSegments[JSCompiler_inline_result]
                )) {
                  JSCompiler_inline_result++;
                  completedSegments.splice(0, JSCompiler_inline_result);
                  var JSCompiler_inline_result$jscomp$0 = false;
                  break a;
                }
              completedSegments.splice(0, JSCompiler_inline_result);
              var row = boundary$69.row;
              null !== row && row.together && 1 === boundary$69.pendingTasks && (1 === row.pendingTasks ? unblockSuspenseListRow(
                clientRenderedBoundaries,
                row,
                row.hoistables
              ) : row.pendingTasks--);
              JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(
                boundary,
                boundary$69.contentState,
                clientRenderedBoundaries.renderState
              );
            }
            if (!JSCompiler_inline_result$jscomp$0) {
              request.destination = null;
              i++;
              partialBoundaries.splice(0, i);
              return;
            }
          }
          partialBoundaries.splice(0, i);
          flushingPartialBoundaries = false;
          var largeBoundaries = request.completedBoundaries;
          for (i = 0; i < largeBoundaries.length; i++)
            if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
              request.destination = null;
              i++;
              largeBoundaries.splice(0, i);
              return;
            }
          largeBoundaries.splice(0, i);
        }
      } finally {
        flushingPartialBoundaries = false, 0 === request.allPendingTasks && 0 === request.clientRenderedBoundaries.length && 0 === request.completedBoundaries.length && (request.flushScheduled = false, i = request.resumableState, i.hasBody && (partialBoundaries = endChunkForTag("body"), destination.push(partialBoundaries)), i.hasHtml && (i = endChunkForTag("html"), destination.push(i)), request.status = 14, destination.push(null), request.destination = null);
      }
    }
    function enqueueFlush(request) {
      if (false === request.flushScheduled && 0 === request.pingedTasks.length && null !== request.destination) {
        request.flushScheduled = true;
        var destination = request.destination;
        destination ? flushCompletedQueues(request, destination) : request.flushScheduled = false;
      }
    }
    function startFlowing(request, destination) {
      if (13 === request.status)
        request.status = 14, destination.destroy(request.fatalError);
      else if (14 !== request.status && null === request.destination) {
        request.destination = destination;
        try {
          flushCompletedQueues(request, destination);
        } catch (error) {
          logRecoverableError(request, error, {}), fatalError(request, error);
        }
      }
    }
    function abort(request, reason) {
      if (11 === request.status || 10 === request.status) request.status = 12;
      try {
        var abortableTasks = request.abortableTasks;
        if (0 < abortableTasks.size) {
          var error = void 0 === reason ? Error("The render was aborted by the server without a reason.") : "object" === typeof reason && null !== reason && "function" === typeof reason.then ? Error("The render was aborted by the server with a promise.") : reason;
          request.fatalError = error;
          abortableTasks.forEach(function(task) {
            return abortTask(task, request, error);
          });
          abortableTasks.clear();
        }
        null !== request.destination && flushCompletedQueues(request, request.destination);
      } catch (error$71) {
        logRecoverableError(request, error$71, {}), fatalError(request, error$71);
      }
    }
    function addToReplayParent(node, parentKeyPath, trackedPostpones) {
      if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
      else {
        var workingMap = trackedPostpones.workingMap, parentNode = workingMap.get(parentKeyPath);
        void 0 === parentNode && (parentNode = [parentKeyPath[1], parentKeyPath[2], [], null], workingMap.set(parentKeyPath, parentNode), addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
        parentNode[2].push(node);
      }
    }
    function onError() {
    }
    function renderToStringImpl(children, options, generateStaticMarkup, abortReason) {
      var didFatal = false, fatalError2 = null, result = "", readyToStream = false;
      options = createResumableState(options ? options.identifierPrefix : void 0);
      children = createRequest(
        children,
        options,
        createRenderState(options, generateStaticMarkup),
        createFormatContext(0, null, 0, null),
        Infinity,
        onError,
        void 0,
        function() {
          readyToStream = true;
        },
        void 0,
        void 0,
        void 0
      );
      children.flushScheduled = null !== children.destination;
      performWork(children);
      10 === children.status && (children.status = 11);
      null === children.trackedPostpones && safelyEmitEarlyPreloads(children, 0 === children.pendingRootTasks);
      abort(children, abortReason);
      startFlowing(children, {
        push: function(chunk) {
          null !== chunk && (result += chunk);
          return true;
        },
        destroy: function(error) {
          didFatal = true;
          fatalError2 = error;
        }
      });
      if (didFatal && fatalError2 !== abortReason) throw fatalError2;
      if (!readyToStream)
        throw Error(
          "A component suspended while responding to synchronous input. This will cause the UI to be replaced with a loading indicator. To fix, updates that suspend should be wrapped with startTransition."
        );
      return result;
    }
    exports.renderToStaticMarkup = function(children, options) {
      return renderToStringImpl(
        children,
        options,
        true,
        'The server used "renderToStaticMarkup" which does not support Suspense. If you intended to have the server wait for the suspended component please switch to "renderToPipeableStream" which supports Suspense on the server'
      );
    };
    exports.renderToString = function(children, options) {
      return renderToStringImpl(
        children,
        options,
        false,
        'The server used "renderToString" which does not support Suspense. If you intended for this Suspense boundary to render the fallback content on the server consider throwing an Error somewhere within the Suspense boundary. If you intended to have the server wait for the suspended component please switch to "renderToPipeableStream" which supports Suspense on the server'
      );
    };
    exports.version = "19.2.8";
  }
});

// node_modules/react-dom/cjs/react-dom-server.node.production.js
var require_react_dom_server_node_production = __commonJS({
  "node_modules/react-dom/cjs/react-dom-server.node.production.js"(exports) {
    "use strict";
    var util = __require("util");
    var crypto = __require("crypto");
    var async_hooks = __require("async_hooks");
    var React2 = require_react();
    var ReactDOM = require_react_dom();
    var stream = __require("stream");
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element");
    var REACT_PORTAL_TYPE = /* @__PURE__ */ Symbol.for("react.portal");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    var REACT_STRICT_MODE_TYPE = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var REACT_PROFILER_TYPE = /* @__PURE__ */ Symbol.for("react.profiler");
    var REACT_CONSUMER_TYPE = /* @__PURE__ */ Symbol.for("react.consumer");
    var REACT_CONTEXT_TYPE = /* @__PURE__ */ Symbol.for("react.context");
    var REACT_FORWARD_REF_TYPE = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var REACT_SUSPENSE_TYPE = /* @__PURE__ */ Symbol.for("react.suspense");
    var REACT_SUSPENSE_LIST_TYPE = /* @__PURE__ */ Symbol.for("react.suspense_list");
    var REACT_MEMO_TYPE = /* @__PURE__ */ Symbol.for("react.memo");
    var REACT_LAZY_TYPE = /* @__PURE__ */ Symbol.for("react.lazy");
    var REACT_SCOPE_TYPE = /* @__PURE__ */ Symbol.for("react.scope");
    var REACT_ACTIVITY_TYPE = /* @__PURE__ */ Symbol.for("react.activity");
    var REACT_LEGACY_HIDDEN_TYPE = /* @__PURE__ */ Symbol.for("react.legacy_hidden");
    var REACT_MEMO_CACHE_SENTINEL = /* @__PURE__ */ Symbol.for("react.memo_cache_sentinel");
    var REACT_VIEW_TRANSITION_TYPE = /* @__PURE__ */ Symbol.for("react.view_transition");
    var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
    function getIteratorFn(maybeIterable) {
      if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
      maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
      return "function" === typeof maybeIterable ? maybeIterable : null;
    }
    var isArrayImpl = Array.isArray;
    var scheduleMicrotask = queueMicrotask;
    function flushBuffered(destination) {
      "function" === typeof destination.flush && destination.flush();
    }
    var currentView = null;
    var writtenBytes = 0;
    var destinationHasCapacity$1 = true;
    function writeChunk(destination, chunk) {
      if ("string" === typeof chunk) {
        if (0 !== chunk.length)
          if (2048 < 3 * chunk.length)
            0 < writtenBytes && (writeToDestination(
              destination,
              currentView.subarray(0, writtenBytes)
            ), currentView = new Uint8Array(2048), writtenBytes = 0), writeToDestination(destination, chunk);
          else {
            var target = currentView;
            0 < writtenBytes && (target = currentView.subarray(writtenBytes));
            target = textEncoder.encodeInto(chunk, target);
            var read = target.read;
            writtenBytes += target.written;
            read < chunk.length && (writeToDestination(
              destination,
              currentView.subarray(0, writtenBytes)
            ), currentView = new Uint8Array(2048), writtenBytes = textEncoder.encodeInto(
              chunk.slice(read),
              currentView
            ).written);
            2048 === writtenBytes && (writeToDestination(destination, currentView), currentView = new Uint8Array(2048), writtenBytes = 0);
          }
      } else
        0 !== chunk.byteLength && (2048 < chunk.byteLength ? (0 < writtenBytes && (writeToDestination(
          destination,
          currentView.subarray(0, writtenBytes)
        ), currentView = new Uint8Array(2048), writtenBytes = 0), writeToDestination(destination, chunk)) : (target = currentView.length - writtenBytes, target < chunk.byteLength && (0 === target ? writeToDestination(destination, currentView) : (currentView.set(chunk.subarray(0, target), writtenBytes), writtenBytes += target, writeToDestination(destination, currentView), chunk = chunk.subarray(target)), currentView = new Uint8Array(2048), writtenBytes = 0), currentView.set(chunk, writtenBytes), writtenBytes += chunk.byteLength, 2048 === writtenBytes && (writeToDestination(destination, currentView), currentView = new Uint8Array(2048), writtenBytes = 0)));
    }
    function writeToDestination(destination, view) {
      destination = destination.write(view);
      destinationHasCapacity$1 = destinationHasCapacity$1 && destination;
    }
    function writeChunkAndReturn(destination, chunk) {
      writeChunk(destination, chunk);
      return destinationHasCapacity$1;
    }
    function completeWriting(destination) {
      currentView && 0 < writtenBytes && destination.write(currentView.subarray(0, writtenBytes));
      currentView = null;
      writtenBytes = 0;
      destinationHasCapacity$1 = true;
    }
    var textEncoder = new util.TextEncoder();
    function stringToPrecomputedChunk(content) {
      return textEncoder.encode(content);
    }
    function byteLengthOfChunk(chunk) {
      return "string" === typeof chunk ? Buffer.byteLength(chunk, "utf8") : chunk.byteLength;
    }
    var assign = Object.assign;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var VALID_ATTRIBUTE_NAME_REGEX = RegExp(
      "^[:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD][:A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040]*$"
    );
    var illegalAttributeNameCache = {};
    var validatedAttributeNameCache = {};
    function isAttributeNameSafe(attributeName) {
      if (hasOwnProperty.call(validatedAttributeNameCache, attributeName))
        return true;
      if (hasOwnProperty.call(illegalAttributeNameCache, attributeName)) return false;
      if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName))
        return validatedAttributeNameCache[attributeName] = true;
      illegalAttributeNameCache[attributeName] = true;
      return false;
    }
    var unitlessNumbers = new Set(
      "animationIterationCount aspectRatio borderImageOutset borderImageSlice borderImageWidth boxFlex boxFlexGroup boxOrdinalGroup columnCount columns flex flexGrow flexPositive flexShrink flexNegative flexOrder gridArea gridRow gridRowEnd gridRowSpan gridRowStart gridColumn gridColumnEnd gridColumnSpan gridColumnStart fontWeight lineClamp lineHeight opacity order orphans scale tabSize widows zIndex zoom fillOpacity floodOpacity stopOpacity strokeDasharray strokeDashoffset strokeMiterlimit strokeOpacity strokeWidth MozAnimationIterationCount MozBoxFlex MozBoxFlexGroup MozLineClamp msAnimationIterationCount msFlex msZoom msFlexGrow msFlexNegative msFlexOrder msFlexPositive msFlexShrink msGridColumn msGridColumnSpan msGridRow msGridRowSpan WebkitAnimationIterationCount WebkitBoxFlex WebKitBoxFlexGroup WebkitBoxOrdinalGroup WebkitColumnCount WebkitColumns WebkitFlex WebkitFlexGrow WebkitFlexPositive WebkitFlexShrink WebkitLineClamp".split(
        " "
      )
    );
    var aliases = /* @__PURE__ */ new Map([
      ["acceptCharset", "accept-charset"],
      ["htmlFor", "for"],
      ["httpEquiv", "http-equiv"],
      ["crossOrigin", "crossorigin"],
      ["accentHeight", "accent-height"],
      ["alignmentBaseline", "alignment-baseline"],
      ["arabicForm", "arabic-form"],
      ["baselineShift", "baseline-shift"],
      ["capHeight", "cap-height"],
      ["clipPath", "clip-path"],
      ["clipRule", "clip-rule"],
      ["colorInterpolation", "color-interpolation"],
      ["colorInterpolationFilters", "color-interpolation-filters"],
      ["colorProfile", "color-profile"],
      ["colorRendering", "color-rendering"],
      ["dominantBaseline", "dominant-baseline"],
      ["enableBackground", "enable-background"],
      ["fillOpacity", "fill-opacity"],
      ["fillRule", "fill-rule"],
      ["floodColor", "flood-color"],
      ["floodOpacity", "flood-opacity"],
      ["fontFamily", "font-family"],
      ["fontSize", "font-size"],
      ["fontSizeAdjust", "font-size-adjust"],
      ["fontStretch", "font-stretch"],
      ["fontStyle", "font-style"],
      ["fontVariant", "font-variant"],
      ["fontWeight", "font-weight"],
      ["glyphName", "glyph-name"],
      ["glyphOrientationHorizontal", "glyph-orientation-horizontal"],
      ["glyphOrientationVertical", "glyph-orientation-vertical"],
      ["horizAdvX", "horiz-adv-x"],
      ["horizOriginX", "horiz-origin-x"],
      ["imageRendering", "image-rendering"],
      ["letterSpacing", "letter-spacing"],
      ["lightingColor", "lighting-color"],
      ["markerEnd", "marker-end"],
      ["markerMid", "marker-mid"],
      ["markerStart", "marker-start"],
      ["overlinePosition", "overline-position"],
      ["overlineThickness", "overline-thickness"],
      ["paintOrder", "paint-order"],
      ["panose-1", "panose-1"],
      ["pointerEvents", "pointer-events"],
      ["renderingIntent", "rendering-intent"],
      ["shapeRendering", "shape-rendering"],
      ["stopColor", "stop-color"],
      ["stopOpacity", "stop-opacity"],
      ["strikethroughPosition", "strikethrough-position"],
      ["strikethroughThickness", "strikethrough-thickness"],
      ["strokeDasharray", "stroke-dasharray"],
      ["strokeDashoffset", "stroke-dashoffset"],
      ["strokeLinecap", "stroke-linecap"],
      ["strokeLinejoin", "stroke-linejoin"],
      ["strokeMiterlimit", "stroke-miterlimit"],
      ["strokeOpacity", "stroke-opacity"],
      ["strokeWidth", "stroke-width"],
      ["textAnchor", "text-anchor"],
      ["textDecoration", "text-decoration"],
      ["textRendering", "text-rendering"],
      ["transformOrigin", "transform-origin"],
      ["underlinePosition", "underline-position"],
      ["underlineThickness", "underline-thickness"],
      ["unicodeBidi", "unicode-bidi"],
      ["unicodeRange", "unicode-range"],
      ["unitsPerEm", "units-per-em"],
      ["vAlphabetic", "v-alphabetic"],
      ["vHanging", "v-hanging"],
      ["vIdeographic", "v-ideographic"],
      ["vMathematical", "v-mathematical"],
      ["vectorEffect", "vector-effect"],
      ["vertAdvY", "vert-adv-y"],
      ["vertOriginX", "vert-origin-x"],
      ["vertOriginY", "vert-origin-y"],
      ["wordSpacing", "word-spacing"],
      ["writingMode", "writing-mode"],
      ["xmlnsXlink", "xmlns:xlink"],
      ["xHeight", "x-height"]
    ]);
    var matchHtmlRegExp = /["'&<>]/;
    function escapeTextForBrowser(text) {
      if ("boolean" === typeof text || "number" === typeof text || "bigint" === typeof text)
        return "" + text;
      text = "" + text;
      var match = matchHtmlRegExp.exec(text);
      if (match) {
        var html = "", index, lastIndex = 0;
        for (index = match.index; index < text.length; index++) {
          switch (text.charCodeAt(index)) {
            case 34:
              match = "&quot;";
              break;
            case 38:
              match = "&amp;";
              break;
            case 39:
              match = "&#x27;";
              break;
            case 60:
              match = "&lt;";
              break;
            case 62:
              match = "&gt;";
              break;
            default:
              continue;
          }
          lastIndex !== index && (html += text.slice(lastIndex, index));
          lastIndex = index + 1;
          html += match;
        }
        text = lastIndex !== index ? html + text.slice(lastIndex, index) : html;
      }
      return text;
    }
    var uppercasePattern = /([A-Z])/g;
    var msPattern = /^ms-/;
    var isJavaScriptProtocol = /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*:/i;
    function sanitizeURL(url) {
      return isJavaScriptProtocol.test("" + url) ? "javascript:throw new Error('React has blocked a javascript: URL as a security precaution.')" : url;
    }
    var ReactSharedInternals = React2.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    var ReactDOMSharedInternals = ReactDOM.__DOM_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
    var sharedNotPendingObject = {
      pending: false,
      data: null,
      method: null,
      action: null
    };
    var previousDispatcher = ReactDOMSharedInternals.d;
    ReactDOMSharedInternals.d = {
      f: previousDispatcher.f,
      r: previousDispatcher.r,
      D: prefetchDNS,
      C: preconnect,
      L: preload,
      m: preloadModule,
      X: preinitScript,
      S: preinitStyle,
      M: preinitModuleScript
    };
    var PRELOAD_NO_CREDS = [];
    var currentlyFlushingRenderState = null;
    stringToPrecomputedChunk('"></template>');
    var startInlineScript = stringToPrecomputedChunk("<script");
    var endInlineScript = stringToPrecomputedChunk("</script>");
    var startScriptSrc = stringToPrecomputedChunk('<script src="');
    var startModuleSrc = stringToPrecomputedChunk('<script type="module" src="');
    var scriptNonce = stringToPrecomputedChunk(' nonce="');
    var scriptIntegirty = stringToPrecomputedChunk(' integrity="');
    var scriptCrossOrigin = stringToPrecomputedChunk(' crossorigin="');
    var endAsyncScript = stringToPrecomputedChunk(' async=""></script>');
    var startInlineStyle = stringToPrecomputedChunk("<style");
    var scriptRegex = /(<\/|<)(s)(cript)/gi;
    function scriptReplacer(match, prefix2, s, suffix2) {
      return "" + prefix2 + ("s" === s ? "\\u0073" : "\\u0053") + suffix2;
    }
    var importMapScriptStart = stringToPrecomputedChunk(
      '<script type="importmap">'
    );
    var importMapScriptEnd = stringToPrecomputedChunk("</script>");
    function createRenderState(resumableState, nonce, externalRuntimeConfig, importMap, onHeaders, maxHeadersLength) {
      externalRuntimeConfig = "string" === typeof nonce ? nonce : nonce && nonce.script;
      var inlineScriptWithNonce = void 0 === externalRuntimeConfig ? startInlineScript : stringToPrecomputedChunk(
        '<script nonce="' + escapeTextForBrowser(externalRuntimeConfig) + '"'
      ), nonceStyle = "string" === typeof nonce ? void 0 : nonce && nonce.style, inlineStyleWithNonce = void 0 === nonceStyle ? startInlineStyle : stringToPrecomputedChunk(
        '<style nonce="' + escapeTextForBrowser(nonceStyle) + '"'
      ), idPrefix = resumableState.idPrefix, bootstrapChunks = [], bootstrapScriptContent = resumableState.bootstrapScriptContent, bootstrapScripts = resumableState.bootstrapScripts, bootstrapModules = resumableState.bootstrapModules;
      void 0 !== bootstrapScriptContent && (bootstrapChunks.push(inlineScriptWithNonce), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(
        endOfStartTag,
        ("" + bootstrapScriptContent).replace(scriptRegex, scriptReplacer),
        endInlineScript
      ));
      bootstrapScriptContent = [];
      void 0 !== importMap && (bootstrapScriptContent.push(importMapScriptStart), bootstrapScriptContent.push(
        ("" + JSON.stringify(importMap)).replace(scriptRegex, scriptReplacer)
      ), bootstrapScriptContent.push(importMapScriptEnd));
      importMap = onHeaders ? {
        preconnects: "",
        fontPreloads: "",
        highImagePreloads: "",
        remainingCapacity: 2 + ("number" === typeof maxHeadersLength ? maxHeadersLength : 2e3)
      } : null;
      onHeaders = {
        placeholderPrefix: stringToPrecomputedChunk(idPrefix + "P:"),
        segmentPrefix: stringToPrecomputedChunk(idPrefix + "S:"),
        boundaryPrefix: stringToPrecomputedChunk(idPrefix + "B:"),
        startInlineScript: inlineScriptWithNonce,
        startInlineStyle: inlineStyleWithNonce,
        preamble: createPreambleState(),
        externalRuntimeScript: null,
        bootstrapChunks,
        importMapChunks: bootstrapScriptContent,
        onHeaders,
        headers: importMap,
        resets: {
          font: {},
          dns: {},
          connect: { default: {}, anonymous: {}, credentials: {} },
          image: {},
          style: {}
        },
        charsetChunks: [],
        viewportChunks: [],
        hoistableChunks: [],
        preconnects: /* @__PURE__ */ new Set(),
        fontPreloads: /* @__PURE__ */ new Set(),
        highImagePreloads: /* @__PURE__ */ new Set(),
        styles: /* @__PURE__ */ new Map(),
        bootstrapScripts: /* @__PURE__ */ new Set(),
        scripts: /* @__PURE__ */ new Set(),
        bulkPreloads: /* @__PURE__ */ new Set(),
        preloads: {
          images: /* @__PURE__ */ new Map(),
          stylesheets: /* @__PURE__ */ new Map(),
          scripts: /* @__PURE__ */ new Map(),
          moduleScripts: /* @__PURE__ */ new Map()
        },
        nonce: { script: externalRuntimeConfig, style: nonceStyle },
        hoistableState: null,
        stylesToHoist: false
      };
      if (void 0 !== bootstrapScripts)
        for (importMap = 0; importMap < bootstrapScripts.length; importMap++)
          idPrefix = bootstrapScripts[importMap], nonceStyle = inlineScriptWithNonce = void 0, inlineStyleWithNonce = {
            rel: "preload",
            as: "script",
            fetchPriority: "low",
            nonce
          }, "string" === typeof idPrefix ? inlineStyleWithNonce.href = maxHeadersLength = idPrefix : (inlineStyleWithNonce.href = maxHeadersLength = idPrefix.src, inlineStyleWithNonce.integrity = nonceStyle = "string" === typeof idPrefix.integrity ? idPrefix.integrity : void 0, inlineStyleWithNonce.crossOrigin = inlineScriptWithNonce = "string" === typeof idPrefix || null == idPrefix.crossOrigin ? void 0 : "use-credentials" === idPrefix.crossOrigin ? "use-credentials" : ""), idPrefix = resumableState, bootstrapScriptContent = maxHeadersLength, idPrefix.scriptResources[bootstrapScriptContent] = null, idPrefix.moduleScriptResources[bootstrapScriptContent] = null, idPrefix = [], pushLinkImpl(idPrefix, inlineStyleWithNonce), onHeaders.bootstrapScripts.add(idPrefix), bootstrapChunks.push(
            startScriptSrc,
            escapeTextForBrowser(maxHeadersLength),
            attributeEnd
          ), externalRuntimeConfig && bootstrapChunks.push(
            scriptNonce,
            escapeTextForBrowser(externalRuntimeConfig),
            attributeEnd
          ), "string" === typeof nonceStyle && bootstrapChunks.push(
            scriptIntegirty,
            escapeTextForBrowser(nonceStyle),
            attributeEnd
          ), "string" === typeof inlineScriptWithNonce && bootstrapChunks.push(
            scriptCrossOrigin,
            escapeTextForBrowser(inlineScriptWithNonce),
            attributeEnd
          ), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endAsyncScript);
      if (void 0 !== bootstrapModules)
        for (nonce = 0; nonce < bootstrapModules.length; nonce++)
          nonceStyle = bootstrapModules[nonce], maxHeadersLength = importMap = void 0, inlineScriptWithNonce = {
            rel: "modulepreload",
            fetchPriority: "low",
            nonce: externalRuntimeConfig
          }, "string" === typeof nonceStyle ? inlineScriptWithNonce.href = bootstrapScripts = nonceStyle : (inlineScriptWithNonce.href = bootstrapScripts = nonceStyle.src, inlineScriptWithNonce.integrity = maxHeadersLength = "string" === typeof nonceStyle.integrity ? nonceStyle.integrity : void 0, inlineScriptWithNonce.crossOrigin = importMap = "string" === typeof nonceStyle || null == nonceStyle.crossOrigin ? void 0 : "use-credentials" === nonceStyle.crossOrigin ? "use-credentials" : ""), nonceStyle = resumableState, inlineStyleWithNonce = bootstrapScripts, nonceStyle.scriptResources[inlineStyleWithNonce] = null, nonceStyle.moduleScriptResources[inlineStyleWithNonce] = null, nonceStyle = [], pushLinkImpl(nonceStyle, inlineScriptWithNonce), onHeaders.bootstrapScripts.add(nonceStyle), bootstrapChunks.push(
            startModuleSrc,
            escapeTextForBrowser(bootstrapScripts),
            attributeEnd
          ), externalRuntimeConfig && bootstrapChunks.push(
            scriptNonce,
            escapeTextForBrowser(externalRuntimeConfig),
            attributeEnd
          ), "string" === typeof maxHeadersLength && bootstrapChunks.push(
            scriptIntegirty,
            escapeTextForBrowser(maxHeadersLength),
            attributeEnd
          ), "string" === typeof importMap && bootstrapChunks.push(
            scriptCrossOrigin,
            escapeTextForBrowser(importMap),
            attributeEnd
          ), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(endAsyncScript);
      return onHeaders;
    }
    function createResumableState(identifierPrefix, externalRuntimeConfig, bootstrapScriptContent, bootstrapScripts, bootstrapModules) {
      return {
        idPrefix: void 0 === identifierPrefix ? "" : identifierPrefix,
        nextFormID: 0,
        streamingFormat: 0,
        bootstrapScriptContent,
        bootstrapScripts,
        bootstrapModules,
        instructions: 0,
        hasBody: false,
        hasHtml: false,
        unknownResources: {},
        dnsResources: {},
        connectResources: { default: {}, anonymous: {}, credentials: {} },
        imageResources: {},
        styleResources: {},
        scriptResources: {},
        moduleUnknownResources: {},
        moduleScriptResources: {}
      };
    }
    function createPreambleState() {
      return { htmlChunks: null, headChunks: null, bodyChunks: null };
    }
    function createFormatContext(insertionMode, selectedValue, tagScope, viewTransition) {
      return {
        insertionMode,
        selectedValue,
        tagScope,
        viewTransition
      };
    }
    function createRootFormatContext(namespaceURI) {
      return createFormatContext(
        "http://www.w3.org/2000/svg" === namespaceURI ? 4 : "http://www.w3.org/1998/Math/MathML" === namespaceURI ? 5 : 0,
        null,
        0,
        null
      );
    }
    function getChildFormatContext(parentContext, type, props) {
      var subtreeScope = parentContext.tagScope & -25;
      switch (type) {
        case "noscript":
          return createFormatContext(2, null, subtreeScope | 1, null);
        case "select":
          return createFormatContext(
            2,
            null != props.value ? props.value : props.defaultValue,
            subtreeScope,
            null
          );
        case "svg":
          return createFormatContext(4, null, subtreeScope, null);
        case "picture":
          return createFormatContext(2, null, subtreeScope | 2, null);
        case "math":
          return createFormatContext(5, null, subtreeScope, null);
        case "foreignObject":
          return createFormatContext(2, null, subtreeScope, null);
        case "table":
          return createFormatContext(6, null, subtreeScope, null);
        case "thead":
        case "tbody":
        case "tfoot":
          return createFormatContext(7, null, subtreeScope, null);
        case "colgroup":
          return createFormatContext(9, null, subtreeScope, null);
        case "tr":
          return createFormatContext(8, null, subtreeScope, null);
        case "head":
          if (2 > parentContext.insertionMode)
            return createFormatContext(3, null, subtreeScope, null);
          break;
        case "html":
          if (0 === parentContext.insertionMode)
            return createFormatContext(1, null, subtreeScope, null);
      }
      return 6 <= parentContext.insertionMode || 2 > parentContext.insertionMode ? createFormatContext(2, null, subtreeScope, null) : parentContext.tagScope !== subtreeScope ? createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        subtreeScope,
        null
      ) : parentContext;
    }
    function getSuspenseViewTransition(parentViewTransition) {
      return null === parentViewTransition ? null : {
        update: parentViewTransition.update,
        enter: "none",
        exit: "none",
        share: parentViewTransition.update,
        name: parentViewTransition.autoName,
        autoName: parentViewTransition.autoName,
        nameIdx: 0
      };
    }
    function getSuspenseFallbackFormatContext(resumableState, parentContext) {
      parentContext.tagScope & 32 && (resumableState.instructions |= 128);
      return createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        parentContext.tagScope | 12,
        getSuspenseViewTransition(parentContext.viewTransition)
      );
    }
    function getSuspenseContentFormatContext(resumableState, parentContext) {
      resumableState = getSuspenseViewTransition(parentContext.viewTransition);
      var subtreeScope = parentContext.tagScope | 16;
      null !== resumableState && "none" !== resumableState.share && (subtreeScope |= 64);
      return createFormatContext(
        parentContext.insertionMode,
        parentContext.selectedValue,
        subtreeScope,
        resumableState
      );
    }
    var textSeparator = stringToPrecomputedChunk("<!-- -->");
    function pushTextInstance(target, text, renderState, textEmbedded) {
      if ("" === text) return textEmbedded;
      textEmbedded && target.push(textSeparator);
      target.push(escapeTextForBrowser(text));
      return true;
    }
    var styleNameCache = /* @__PURE__ */ new Map();
    var styleAttributeStart = stringToPrecomputedChunk(' style="');
    var styleAssign = stringToPrecomputedChunk(":");
    var styleSeparator = stringToPrecomputedChunk(";");
    function pushStyleAttribute(target, style) {
      if ("object" !== typeof style)
        throw Error(
          "The `style` prop expects a mapping from style properties to values, not a string. For example, style={{marginRight: spacing + 'em'}} when using JSX."
        );
      var isFirst = true, styleName;
      for (styleName in style)
        if (hasOwnProperty.call(style, styleName)) {
          var styleValue = style[styleName];
          if (null != styleValue && "boolean" !== typeof styleValue && "" !== styleValue) {
            if (0 === styleName.indexOf("--")) {
              var nameChunk = escapeTextForBrowser(styleName);
              styleValue = escapeTextForBrowser(("" + styleValue).trim());
            } else
              nameChunk = styleNameCache.get(styleName), void 0 === nameChunk && (nameChunk = stringToPrecomputedChunk(
                escapeTextForBrowser(
                  styleName.replace(uppercasePattern, "-$1").toLowerCase().replace(msPattern, "-ms-")
                )
              ), styleNameCache.set(styleName, nameChunk)), styleValue = "number" === typeof styleValue ? 0 === styleValue || unitlessNumbers.has(styleName) ? "" + styleValue : styleValue + "px" : escapeTextForBrowser(("" + styleValue).trim());
            isFirst ? (isFirst = false, target.push(
              styleAttributeStart,
              nameChunk,
              styleAssign,
              styleValue
            )) : target.push(styleSeparator, nameChunk, styleAssign, styleValue);
          }
        }
      isFirst || target.push(attributeEnd);
    }
    var attributeSeparator = stringToPrecomputedChunk(" ");
    var attributeAssign = stringToPrecomputedChunk('="');
    var attributeEnd = stringToPrecomputedChunk('"');
    var attributeEmptyString = stringToPrecomputedChunk('=""');
    function pushBooleanAttribute(target, name, value) {
      value && "function" !== typeof value && "symbol" !== typeof value && target.push(attributeSeparator, name, attributeEmptyString);
    }
    function pushStringAttribute(target, name, value) {
      "function" !== typeof value && "symbol" !== typeof value && "boolean" !== typeof value && target.push(
        attributeSeparator,
        name,
        attributeAssign,
        escapeTextForBrowser(value),
        attributeEnd
      );
    }
    var actionJavaScriptURL = stringToPrecomputedChunk(
      escapeTextForBrowser(
        "javascript:throw new Error('React form unexpectedly submitted.')"
      )
    );
    var startHiddenInputChunk = stringToPrecomputedChunk('<input type="hidden"');
    function pushAdditionalFormField(value, key) {
      this.push(startHiddenInputChunk);
      validateAdditionalFormField(value);
      pushStringAttribute(this, "name", key);
      pushStringAttribute(this, "value", value);
      this.push(endOfStartTagSelfClosing);
    }
    function validateAdditionalFormField(value) {
      if ("string" !== typeof value)
        throw Error(
          "File/Blob fields are not yet supported in progressive forms. Will fallback to client hydration."
        );
    }
    function getCustomFormFields(resumableState, formAction) {
      if ("function" === typeof formAction.$$FORM_ACTION) {
        var id = resumableState.nextFormID++;
        resumableState = resumableState.idPrefix + id;
        try {
          var customFields = formAction.$$FORM_ACTION(resumableState);
          if (customFields) {
            var formData = customFields.data;
            null != formData && formData.forEach(validateAdditionalFormField);
          }
          return customFields;
        } catch (x) {
          if ("object" === typeof x && null !== x && "function" === typeof x.then)
            throw x;
        }
      }
      return null;
    }
    function pushFormActionAttribute(target, resumableState, renderState, formAction, formEncType, formMethod, formTarget, name) {
      var formData = null;
      if ("function" === typeof formAction) {
        var customFields = getCustomFormFields(resumableState, formAction);
        null !== customFields ? (name = customFields.name, formAction = customFields.action || "", formEncType = customFields.encType, formMethod = customFields.method, formTarget = customFields.target, formData = customFields.data) : (target.push(
          attributeSeparator,
          "formAction",
          attributeAssign,
          actionJavaScriptURL,
          attributeEnd
        ), formTarget = formMethod = formEncType = formAction = name = null, injectFormReplayingRuntime(resumableState, renderState));
      }
      null != name && pushAttribute(target, "name", name);
      null != formAction && pushAttribute(target, "formAction", formAction);
      null != formEncType && pushAttribute(target, "formEncType", formEncType);
      null != formMethod && pushAttribute(target, "formMethod", formMethod);
      null != formTarget && pushAttribute(target, "formTarget", formTarget);
      return formData;
    }
    function pushAttribute(target, name, value) {
      switch (name) {
        case "className":
          pushStringAttribute(target, "class", value);
          break;
        case "tabIndex":
          pushStringAttribute(target, "tabindex", value);
          break;
        case "dir":
        case "role":
        case "viewBox":
        case "width":
        case "height":
          pushStringAttribute(target, name, value);
          break;
        case "style":
          pushStyleAttribute(target, value);
          break;
        case "src":
        case "href":
          if ("" === value) break;
        case "action":
        case "formAction":
          if (null == value || "function" === typeof value || "symbol" === typeof value || "boolean" === typeof value)
            break;
          value = sanitizeURL("" + value);
          target.push(
            attributeSeparator,
            name,
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
          break;
        case "defaultValue":
        case "defaultChecked":
        case "innerHTML":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "ref":
          break;
        case "autoFocus":
        case "multiple":
        case "muted":
          pushBooleanAttribute(target, name.toLowerCase(), value);
          break;
        case "xlinkHref":
          if ("function" === typeof value || "symbol" === typeof value || "boolean" === typeof value)
            break;
          value = sanitizeURL("" + value);
          target.push(
            attributeSeparator,
            "xlink:href",
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
          break;
        case "contentEditable":
        case "spellCheck":
        case "draggable":
        case "value":
        case "autoReverse":
        case "externalResourcesRequired":
        case "focusable":
        case "preserveAlpha":
          "function" !== typeof value && "symbol" !== typeof value && target.push(
            attributeSeparator,
            name,
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
          break;
        case "inert":
        case "allowFullScreen":
        case "async":
        case "autoPlay":
        case "controls":
        case "default":
        case "defer":
        case "disabled":
        case "disablePictureInPicture":
        case "disableRemotePlayback":
        case "formNoValidate":
        case "hidden":
        case "loop":
        case "noModule":
        case "noValidate":
        case "open":
        case "playsInline":
        case "readOnly":
        case "required":
        case "reversed":
        case "scoped":
        case "seamless":
        case "itemScope":
          value && "function" !== typeof value && "symbol" !== typeof value && target.push(attributeSeparator, name, attributeEmptyString);
          break;
        case "capture":
        case "download":
          true === value ? target.push(attributeSeparator, name, attributeEmptyString) : false !== value && "function" !== typeof value && "symbol" !== typeof value && target.push(
            attributeSeparator,
            name,
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
          break;
        case "cols":
        case "rows":
        case "size":
        case "span":
          "function" !== typeof value && "symbol" !== typeof value && !isNaN(value) && 1 <= value && target.push(
            attributeSeparator,
            name,
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
          break;
        case "rowSpan":
        case "start":
          "function" === typeof value || "symbol" === typeof value || isNaN(value) || target.push(
            attributeSeparator,
            name,
            attributeAssign,
            escapeTextForBrowser(value),
            attributeEnd
          );
          break;
        case "xlinkActuate":
          pushStringAttribute(target, "xlink:actuate", value);
          break;
        case "xlinkArcrole":
          pushStringAttribute(target, "xlink:arcrole", value);
          break;
        case "xlinkRole":
          pushStringAttribute(target, "xlink:role", value);
          break;
        case "xlinkShow":
          pushStringAttribute(target, "xlink:show", value);
          break;
        case "xlinkTitle":
          pushStringAttribute(target, "xlink:title", value);
          break;
        case "xlinkType":
          pushStringAttribute(target, "xlink:type", value);
          break;
        case "xmlBase":
          pushStringAttribute(target, "xml:base", value);
          break;
        case "xmlLang":
          pushStringAttribute(target, "xml:lang", value);
          break;
        case "xmlSpace":
          pushStringAttribute(target, "xml:space", value);
          break;
        default:
          if (!(2 < name.length) || "o" !== name[0] && "O" !== name[0] || "n" !== name[1] && "N" !== name[1]) {
            if (name = aliases.get(name) || name, isAttributeNameSafe(name)) {
              switch (typeof value) {
                case "function":
                case "symbol":
                  return;
                case "boolean":
                  var prefix$8 = name.toLowerCase().slice(0, 5);
                  if ("data-" !== prefix$8 && "aria-" !== prefix$8) return;
              }
              target.push(
                attributeSeparator,
                name,
                attributeAssign,
                escapeTextForBrowser(value),
                attributeEnd
              );
            }
          }
      }
    }
    var endOfStartTag = stringToPrecomputedChunk(">");
    var endOfStartTagSelfClosing = stringToPrecomputedChunk("/>");
    function pushInnerHTML(target, innerHTML, children) {
      if (null != innerHTML) {
        if (null != children)
          throw Error(
            "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
          );
        if ("object" !== typeof innerHTML || !("__html" in innerHTML))
          throw Error(
            "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
          );
        innerHTML = innerHTML.__html;
        null !== innerHTML && void 0 !== innerHTML && target.push("" + innerHTML);
      }
    }
    function flattenOptionChildren(children) {
      var content = "";
      React2.Children.forEach(children, function(child) {
        null != child && (content += child);
      });
      return content;
    }
    var selectedMarkerAttribute = stringToPrecomputedChunk(' selected=""');
    var formReplayingRuntimeScript = stringToPrecomputedChunk(
      `addEventListener("submit",function(a){if(!a.defaultPrevented){var c=a.target,d=a.submitter,e=c.action,b=d;if(d){var f=d.getAttribute("formAction");null!=f&&(e=f,b=null)}"javascript:throw new Error('React form unexpectedly submitted.')"===e&&(a.preventDefault(),b?(a=document.createElement("input"),a.name=b.name,a.value=b.value,b.parentNode.insertBefore(a,b),b=new FormData(c),a.parentNode.removeChild(a)):b=new FormData(c),a=c.ownerDocument||c,(a.$$reactFormReplay=a.$$reactFormReplay||[]).push(c,d,b))}});`
    );
    function injectFormReplayingRuntime(resumableState, renderState) {
      if (0 === (resumableState.instructions & 16)) {
        resumableState.instructions |= 16;
        var preamble = renderState.preamble, bootstrapChunks = renderState.bootstrapChunks;
        (preamble.htmlChunks || preamble.headChunks) && 0 === bootstrapChunks.length ? (bootstrapChunks.push(renderState.startInlineScript), pushCompletedShellIdAttribute(bootstrapChunks, resumableState), bootstrapChunks.push(
          endOfStartTag,
          formReplayingRuntimeScript,
          endInlineScript
        )) : bootstrapChunks.unshift(
          renderState.startInlineScript,
          endOfStartTag,
          formReplayingRuntimeScript,
          endInlineScript
        );
      }
    }
    var formStateMarkerIsMatching = stringToPrecomputedChunk("<!--F!-->");
    var formStateMarkerIsNotMatching = stringToPrecomputedChunk("<!--F-->");
    function pushLinkImpl(target, props) {
      target.push(startChunkForTag("link"));
      for (var propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(
                  "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                );
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTagSelfClosing);
      return null;
    }
    var styleRegex = /(<\/|<)(s)(tyle)/gi;
    function styleReplacer(match, prefix2, s, suffix2) {
      return "" + prefix2 + ("s" === s ? "\\73 " : "\\53 ") + suffix2;
    }
    function pushSelfClosing(target, props, tag) {
      target.push(startChunkForTag(tag));
      for (var propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
              case "dangerouslySetInnerHTML":
                throw Error(
                  tag + " is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                );
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTagSelfClosing);
      return null;
    }
    function pushTitleImpl(target, props) {
      target.push(startChunkForTag("title"));
      var children = null, innerHTML = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      props = Array.isArray(children) ? 2 > children.length ? children[0] : null : children;
      "function" !== typeof props && "symbol" !== typeof props && null !== props && void 0 !== props && target.push(escapeTextForBrowser("" + props));
      pushInnerHTML(target, innerHTML, children);
      target.push(endChunkForTag("title"));
      return null;
    }
    var headPreambleContributionChunk = stringToPrecomputedChunk("<!--head-->");
    var bodyPreambleContributionChunk = stringToPrecomputedChunk("<!--body-->");
    var htmlPreambleContributionChunk = stringToPrecomputedChunk("<!--html-->");
    function pushScriptImpl(target, props) {
      target.push(startChunkForTag("script"));
      var children = null, innerHTML = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                children = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      pushInnerHTML(target, innerHTML, children);
      "string" === typeof children && target.push(("" + children).replace(scriptRegex, scriptReplacer));
      target.push(endChunkForTag("script"));
      return null;
    }
    function pushStartSingletonElement(target, props, tag) {
      target.push(startChunkForTag(tag));
      var innerHTML = tag = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                tag = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      pushInnerHTML(target, innerHTML, tag);
      return tag;
    }
    function pushStartGenericElement(target, props, tag) {
      target.push(startChunkForTag(tag));
      var innerHTML = tag = null, propKey;
      for (propKey in props)
        if (hasOwnProperty.call(props, propKey)) {
          var propValue = props[propKey];
          if (null != propValue)
            switch (propKey) {
              case "children":
                tag = propValue;
                break;
              case "dangerouslySetInnerHTML":
                innerHTML = propValue;
                break;
              default:
                pushAttribute(target, propKey, propValue);
            }
        }
      target.push(endOfStartTag);
      pushInnerHTML(target, innerHTML, tag);
      return "string" === typeof tag ? (target.push(escapeTextForBrowser(tag)), null) : tag;
    }
    var leadingNewline = stringToPrecomputedChunk("\n");
    var VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/;
    var validatedTagCache = /* @__PURE__ */ new Map();
    function startChunkForTag(tag) {
      var tagStartChunk = validatedTagCache.get(tag);
      if (void 0 === tagStartChunk) {
        if (!VALID_TAG_REGEX.test(tag)) throw Error("Invalid tag: " + tag);
        tagStartChunk = stringToPrecomputedChunk("<" + tag);
        validatedTagCache.set(tag, tagStartChunk);
      }
      return tagStartChunk;
    }
    var doctypeChunk = stringToPrecomputedChunk("<!DOCTYPE html>");
    function pushStartInstance(target$jscomp$0, type, props, resumableState, renderState, preambleState, hoistableState, formatContext, textEmbedded) {
      switch (type) {
        case "div":
        case "span":
        case "svg":
        case "path":
          break;
        case "a":
          target$jscomp$0.push(startChunkForTag("a"));
          var children = null, innerHTML = null, propKey;
          for (propKey in props)
            if (hasOwnProperty.call(props, propKey)) {
              var propValue = props[propKey];
              if (null != propValue)
                switch (propKey) {
                  case "children":
                    children = propValue;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML = propValue;
                    break;
                  case "href":
                    "" === propValue ? pushStringAttribute(target$jscomp$0, "href", "") : pushAttribute(target$jscomp$0, propKey, propValue);
                    break;
                  default:
                    pushAttribute(target$jscomp$0, propKey, propValue);
                }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML, children);
          if ("string" === typeof children) {
            target$jscomp$0.push(escapeTextForBrowser(children));
            var JSCompiler_inline_result = null;
          } else JSCompiler_inline_result = children;
          return JSCompiler_inline_result;
        case "g":
        case "p":
        case "li":
          break;
        case "select":
          target$jscomp$0.push(startChunkForTag("select"));
          var children$jscomp$0 = null, innerHTML$jscomp$0 = null, propKey$jscomp$0;
          for (propKey$jscomp$0 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$0)) {
              var propValue$jscomp$0 = props[propKey$jscomp$0];
              if (null != propValue$jscomp$0)
                switch (propKey$jscomp$0) {
                  case "children":
                    children$jscomp$0 = propValue$jscomp$0;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$0 = propValue$jscomp$0;
                    break;
                  case "defaultValue":
                  case "value":
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$0,
                      propValue$jscomp$0
                    );
                }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$0, children$jscomp$0);
          return children$jscomp$0;
        case "option":
          var selectedValue = formatContext.selectedValue;
          target$jscomp$0.push(startChunkForTag("option"));
          var children$jscomp$1 = null, value = null, selected = null, innerHTML$jscomp$1 = null, propKey$jscomp$1;
          for (propKey$jscomp$1 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$1)) {
              var propValue$jscomp$1 = props[propKey$jscomp$1];
              if (null != propValue$jscomp$1)
                switch (propKey$jscomp$1) {
                  case "children":
                    children$jscomp$1 = propValue$jscomp$1;
                    break;
                  case "selected":
                    selected = propValue$jscomp$1;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$1 = propValue$jscomp$1;
                    break;
                  case "value":
                    value = propValue$jscomp$1;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$1,
                      propValue$jscomp$1
                    );
                }
            }
          if (null != selectedValue) {
            var stringValue = null !== value ? "" + value : flattenOptionChildren(children$jscomp$1);
            if (isArrayImpl(selectedValue))
              for (var i = 0; i < selectedValue.length; i++) {
                if ("" + selectedValue[i] === stringValue) {
                  target$jscomp$0.push(selectedMarkerAttribute);
                  break;
                }
              }
            else
              "" + selectedValue === stringValue && target$jscomp$0.push(selectedMarkerAttribute);
          } else selected && target$jscomp$0.push(selectedMarkerAttribute);
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$1, children$jscomp$1);
          return children$jscomp$1;
        case "textarea":
          target$jscomp$0.push(startChunkForTag("textarea"));
          var value$jscomp$0 = null, defaultValue = null, children$jscomp$2 = null, propKey$jscomp$2;
          for (propKey$jscomp$2 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$2)) {
              var propValue$jscomp$2 = props[propKey$jscomp$2];
              if (null != propValue$jscomp$2)
                switch (propKey$jscomp$2) {
                  case "children":
                    children$jscomp$2 = propValue$jscomp$2;
                    break;
                  case "value":
                    value$jscomp$0 = propValue$jscomp$2;
                    break;
                  case "defaultValue":
                    defaultValue = propValue$jscomp$2;
                    break;
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "`dangerouslySetInnerHTML` does not make sense on <textarea>."
                    );
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$2,
                      propValue$jscomp$2
                    );
                }
            }
          null === value$jscomp$0 && null !== defaultValue && (value$jscomp$0 = defaultValue);
          target$jscomp$0.push(endOfStartTag);
          if (null != children$jscomp$2) {
            if (null != value$jscomp$0)
              throw Error(
                "If you supply `defaultValue` on a <textarea>, do not pass children."
              );
            if (isArrayImpl(children$jscomp$2)) {
              if (1 < children$jscomp$2.length)
                throw Error("<textarea> can only have at most one child.");
              value$jscomp$0 = "" + children$jscomp$2[0];
            }
            value$jscomp$0 = "" + children$jscomp$2;
          }
          "string" === typeof value$jscomp$0 && "\n" === value$jscomp$0[0] && target$jscomp$0.push(leadingNewline);
          null !== value$jscomp$0 && target$jscomp$0.push(escapeTextForBrowser("" + value$jscomp$0));
          return null;
        case "input":
          target$jscomp$0.push(startChunkForTag("input"));
          var name = null, formAction = null, formEncType = null, formMethod = null, formTarget = null, value$jscomp$1 = null, defaultValue$jscomp$0 = null, checked = null, defaultChecked = null, propKey$jscomp$3;
          for (propKey$jscomp$3 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$3)) {
              var propValue$jscomp$3 = props[propKey$jscomp$3];
              if (null != propValue$jscomp$3)
                switch (propKey$jscomp$3) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "input is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
                  case "name":
                    name = propValue$jscomp$3;
                    break;
                  case "formAction":
                    formAction = propValue$jscomp$3;
                    break;
                  case "formEncType":
                    formEncType = propValue$jscomp$3;
                    break;
                  case "formMethod":
                    formMethod = propValue$jscomp$3;
                    break;
                  case "formTarget":
                    formTarget = propValue$jscomp$3;
                    break;
                  case "defaultChecked":
                    defaultChecked = propValue$jscomp$3;
                    break;
                  case "defaultValue":
                    defaultValue$jscomp$0 = propValue$jscomp$3;
                    break;
                  case "checked":
                    checked = propValue$jscomp$3;
                    break;
                  case "value":
                    value$jscomp$1 = propValue$jscomp$3;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$3,
                      propValue$jscomp$3
                    );
                }
            }
          var formData = pushFormActionAttribute(
            target$jscomp$0,
            resumableState,
            renderState,
            formAction,
            formEncType,
            formMethod,
            formTarget,
            name
          );
          null !== checked ? pushBooleanAttribute(target$jscomp$0, "checked", checked) : null !== defaultChecked && pushBooleanAttribute(target$jscomp$0, "checked", defaultChecked);
          null !== value$jscomp$1 ? pushAttribute(target$jscomp$0, "value", value$jscomp$1) : null !== defaultValue$jscomp$0 && pushAttribute(target$jscomp$0, "value", defaultValue$jscomp$0);
          target$jscomp$0.push(endOfStartTagSelfClosing);
          null != formData && formData.forEach(pushAdditionalFormField, target$jscomp$0);
          return null;
        case "button":
          target$jscomp$0.push(startChunkForTag("button"));
          var children$jscomp$3 = null, innerHTML$jscomp$2 = null, name$jscomp$0 = null, formAction$jscomp$0 = null, formEncType$jscomp$0 = null, formMethod$jscomp$0 = null, formTarget$jscomp$0 = null, propKey$jscomp$4;
          for (propKey$jscomp$4 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$4)) {
              var propValue$jscomp$4 = props[propKey$jscomp$4];
              if (null != propValue$jscomp$4)
                switch (propKey$jscomp$4) {
                  case "children":
                    children$jscomp$3 = propValue$jscomp$4;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$2 = propValue$jscomp$4;
                    break;
                  case "name":
                    name$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formAction":
                    formAction$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formEncType":
                    formEncType$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formMethod":
                    formMethod$jscomp$0 = propValue$jscomp$4;
                    break;
                  case "formTarget":
                    formTarget$jscomp$0 = propValue$jscomp$4;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$4,
                      propValue$jscomp$4
                    );
                }
            }
          var formData$jscomp$0 = pushFormActionAttribute(
            target$jscomp$0,
            resumableState,
            renderState,
            formAction$jscomp$0,
            formEncType$jscomp$0,
            formMethod$jscomp$0,
            formTarget$jscomp$0,
            name$jscomp$0
          );
          target$jscomp$0.push(endOfStartTag);
          null != formData$jscomp$0 && formData$jscomp$0.forEach(pushAdditionalFormField, target$jscomp$0);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$2, children$jscomp$3);
          if ("string" === typeof children$jscomp$3) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$3));
            var JSCompiler_inline_result$jscomp$0 = null;
          } else JSCompiler_inline_result$jscomp$0 = children$jscomp$3;
          return JSCompiler_inline_result$jscomp$0;
        case "form":
          target$jscomp$0.push(startChunkForTag("form"));
          var children$jscomp$4 = null, innerHTML$jscomp$3 = null, formAction$jscomp$1 = null, formEncType$jscomp$1 = null, formMethod$jscomp$1 = null, formTarget$jscomp$1 = null, propKey$jscomp$5;
          for (propKey$jscomp$5 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$5)) {
              var propValue$jscomp$5 = props[propKey$jscomp$5];
              if (null != propValue$jscomp$5)
                switch (propKey$jscomp$5) {
                  case "children":
                    children$jscomp$4 = propValue$jscomp$5;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$3 = propValue$jscomp$5;
                    break;
                  case "action":
                    formAction$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "encType":
                    formEncType$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "method":
                    formMethod$jscomp$1 = propValue$jscomp$5;
                    break;
                  case "target":
                    formTarget$jscomp$1 = propValue$jscomp$5;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$5,
                      propValue$jscomp$5
                    );
                }
            }
          var formData$jscomp$1 = null, formActionName = null;
          if ("function" === typeof formAction$jscomp$1) {
            var customFields = getCustomFormFields(
              resumableState,
              formAction$jscomp$1
            );
            null !== customFields ? (formAction$jscomp$1 = customFields.action || "", formEncType$jscomp$1 = customFields.encType, formMethod$jscomp$1 = customFields.method, formTarget$jscomp$1 = customFields.target, formData$jscomp$1 = customFields.data, formActionName = customFields.name) : (target$jscomp$0.push(
              attributeSeparator,
              "action",
              attributeAssign,
              actionJavaScriptURL,
              attributeEnd
            ), formTarget$jscomp$1 = formMethod$jscomp$1 = formEncType$jscomp$1 = formAction$jscomp$1 = null, injectFormReplayingRuntime(resumableState, renderState));
          }
          null != formAction$jscomp$1 && pushAttribute(target$jscomp$0, "action", formAction$jscomp$1);
          null != formEncType$jscomp$1 && pushAttribute(target$jscomp$0, "encType", formEncType$jscomp$1);
          null != formMethod$jscomp$1 && pushAttribute(target$jscomp$0, "method", formMethod$jscomp$1);
          null != formTarget$jscomp$1 && pushAttribute(target$jscomp$0, "target", formTarget$jscomp$1);
          target$jscomp$0.push(endOfStartTag);
          null !== formActionName && (target$jscomp$0.push(startHiddenInputChunk), pushStringAttribute(target$jscomp$0, "name", formActionName), target$jscomp$0.push(endOfStartTagSelfClosing), null != formData$jscomp$1 && formData$jscomp$1.forEach(pushAdditionalFormField, target$jscomp$0));
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$3, children$jscomp$4);
          if ("string" === typeof children$jscomp$4) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$4));
            var JSCompiler_inline_result$jscomp$1 = null;
          } else JSCompiler_inline_result$jscomp$1 = children$jscomp$4;
          return JSCompiler_inline_result$jscomp$1;
        case "menuitem":
          target$jscomp$0.push(startChunkForTag("menuitem"));
          for (var propKey$jscomp$6 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$6)) {
              var propValue$jscomp$6 = props[propKey$jscomp$6];
              if (null != propValue$jscomp$6)
                switch (propKey$jscomp$6) {
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "menuitems cannot have `children` nor `dangerouslySetInnerHTML`."
                    );
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$6,
                      propValue$jscomp$6
                    );
                }
            }
          target$jscomp$0.push(endOfStartTag);
          return null;
        case "object":
          target$jscomp$0.push(startChunkForTag("object"));
          var children$jscomp$5 = null, innerHTML$jscomp$4 = null, propKey$jscomp$7;
          for (propKey$jscomp$7 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$7)) {
              var propValue$jscomp$7 = props[propKey$jscomp$7];
              if (null != propValue$jscomp$7)
                switch (propKey$jscomp$7) {
                  case "children":
                    children$jscomp$5 = propValue$jscomp$7;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$4 = propValue$jscomp$7;
                    break;
                  case "data":
                    var sanitizedValue = sanitizeURL("" + propValue$jscomp$7);
                    if ("" === sanitizedValue) break;
                    target$jscomp$0.push(
                      attributeSeparator,
                      "data",
                      attributeAssign,
                      escapeTextForBrowser(sanitizedValue),
                      attributeEnd
                    );
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$7,
                      propValue$jscomp$7
                    );
                }
            }
          target$jscomp$0.push(endOfStartTag);
          pushInnerHTML(target$jscomp$0, innerHTML$jscomp$4, children$jscomp$5);
          if ("string" === typeof children$jscomp$5) {
            target$jscomp$0.push(escapeTextForBrowser(children$jscomp$5));
            var JSCompiler_inline_result$jscomp$2 = null;
          } else JSCompiler_inline_result$jscomp$2 = children$jscomp$5;
          return JSCompiler_inline_result$jscomp$2;
        case "title":
          var noscriptTagInScope = formatContext.tagScope & 1, isFallback = formatContext.tagScope & 4;
          if (4 === formatContext.insertionMode || noscriptTagInScope || null != props.itemProp)
            var JSCompiler_inline_result$jscomp$3 = pushTitleImpl(
              target$jscomp$0,
              props
            );
          else
            isFallback ? JSCompiler_inline_result$jscomp$3 = null : (pushTitleImpl(renderState.hoistableChunks, props), JSCompiler_inline_result$jscomp$3 = void 0);
          return JSCompiler_inline_result$jscomp$3;
        case "link":
          var noscriptTagInScope$jscomp$0 = formatContext.tagScope & 1, isFallback$jscomp$0 = formatContext.tagScope & 4, rel = props.rel, href = props.href, precedence = props.precedence;
          if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$0 || null != props.itemProp || "string" !== typeof rel || "string" !== typeof href || "" === href) {
            pushLinkImpl(target$jscomp$0, props);
            var JSCompiler_inline_result$jscomp$4 = null;
          } else if ("stylesheet" === props.rel)
            if ("string" !== typeof precedence || null != props.disabled || props.onLoad || props.onError)
              JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
                target$jscomp$0,
                props
              );
            else {
              var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
              if (null !== resourceState) {
                resumableState.styleResources[href] = null;
                styleQueue || (styleQueue = {
                  precedence: escapeTextForBrowser(precedence),
                  rules: [],
                  hrefs: [],
                  sheets: /* @__PURE__ */ new Map()
                }, renderState.styles.set(precedence, styleQueue));
                var resource = {
                  state: 0,
                  props: assign({}, props, {
                    "data-precedence": props.precedence,
                    precedence: null
                  })
                };
                if (resourceState) {
                  2 === resourceState.length && adoptPreloadCredentials(resource.props, resourceState);
                  var preloadResource = renderState.preloads.stylesheets.get(href);
                  preloadResource && 0 < preloadResource.length ? preloadResource.length = 0 : resource.state = 1;
                }
                styleQueue.sheets.set(href, resource);
                hoistableState && hoistableState.stylesheets.add(resource);
              } else if (styleQueue) {
                var resource$9 = styleQueue.sheets.get(href);
                resource$9 && hoistableState && hoistableState.stylesheets.add(resource$9);
              }
              textEmbedded && target$jscomp$0.push(textSeparator);
              JSCompiler_inline_result$jscomp$4 = null;
            }
          else
            props.onLoad || props.onError ? JSCompiler_inline_result$jscomp$4 = pushLinkImpl(
              target$jscomp$0,
              props
            ) : (textEmbedded && target$jscomp$0.push(textSeparator), JSCompiler_inline_result$jscomp$4 = isFallback$jscomp$0 ? null : pushLinkImpl(renderState.hoistableChunks, props));
          return JSCompiler_inline_result$jscomp$4;
        case "script":
          var noscriptTagInScope$jscomp$1 = formatContext.tagScope & 1, asyncProp = props.async;
          if ("string" !== typeof props.src || !props.src || !asyncProp || "function" === typeof asyncProp || "symbol" === typeof asyncProp || props.onLoad || props.onError || 4 === formatContext.insertionMode || noscriptTagInScope$jscomp$1 || null != props.itemProp)
            var JSCompiler_inline_result$jscomp$5 = pushScriptImpl(
              target$jscomp$0,
              props
            );
          else {
            var key = props.src;
            if ("module" === props.type) {
              var resources = resumableState.moduleScriptResources;
              var preloads = renderState.preloads.moduleScripts;
            } else
              resources = resumableState.scriptResources, preloads = renderState.preloads.scripts;
            var resourceState$jscomp$0 = resources.hasOwnProperty(key) ? resources[key] : void 0;
            if (null !== resourceState$jscomp$0) {
              resources[key] = null;
              var scriptProps = props;
              if (resourceState$jscomp$0) {
                2 === resourceState$jscomp$0.length && (scriptProps = assign({}, props), adoptPreloadCredentials(scriptProps, resourceState$jscomp$0));
                var preloadResource$jscomp$0 = preloads.get(key);
                preloadResource$jscomp$0 && (preloadResource$jscomp$0.length = 0);
              }
              var resource$jscomp$0 = [];
              renderState.scripts.add(resource$jscomp$0);
              pushScriptImpl(resource$jscomp$0, scriptProps);
            }
            textEmbedded && target$jscomp$0.push(textSeparator);
            JSCompiler_inline_result$jscomp$5 = null;
          }
          return JSCompiler_inline_result$jscomp$5;
        case "style":
          var noscriptTagInScope$jscomp$2 = formatContext.tagScope & 1, precedence$jscomp$0 = props.precedence, href$jscomp$0 = props.href, nonce = props.nonce;
          if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$2 || null != props.itemProp || "string" !== typeof precedence$jscomp$0 || "string" !== typeof href$jscomp$0 || "" === href$jscomp$0) {
            target$jscomp$0.push(startChunkForTag("style"));
            var children$jscomp$6 = null, innerHTML$jscomp$5 = null, propKey$jscomp$8;
            for (propKey$jscomp$8 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$8)) {
                var propValue$jscomp$8 = props[propKey$jscomp$8];
                if (null != propValue$jscomp$8)
                  switch (propKey$jscomp$8) {
                    case "children":
                      children$jscomp$6 = propValue$jscomp$8;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$5 = propValue$jscomp$8;
                      break;
                    default:
                      pushAttribute(
                        target$jscomp$0,
                        propKey$jscomp$8,
                        propValue$jscomp$8
                      );
                  }
              }
            target$jscomp$0.push(endOfStartTag);
            var child = Array.isArray(children$jscomp$6) ? 2 > children$jscomp$6.length ? children$jscomp$6[0] : null : children$jscomp$6;
            "function" !== typeof child && "symbol" !== typeof child && null !== child && void 0 !== child && target$jscomp$0.push(("" + child).replace(styleRegex, styleReplacer));
            pushInnerHTML(target$jscomp$0, innerHTML$jscomp$5, children$jscomp$6);
            target$jscomp$0.push(endChunkForTag("style"));
            var JSCompiler_inline_result$jscomp$6 = null;
          } else {
            var styleQueue$jscomp$0 = renderState.styles.get(precedence$jscomp$0);
            if (null !== (resumableState.styleResources.hasOwnProperty(href$jscomp$0) ? resumableState.styleResources[href$jscomp$0] : void 0)) {
              resumableState.styleResources[href$jscomp$0] = null;
              styleQueue$jscomp$0 || (styleQueue$jscomp$0 = {
                precedence: escapeTextForBrowser(precedence$jscomp$0),
                rules: [],
                hrefs: [],
                sheets: /* @__PURE__ */ new Map()
              }, renderState.styles.set(precedence$jscomp$0, styleQueue$jscomp$0));
              var nonceStyle = renderState.nonce.style;
              if (!nonceStyle || nonceStyle === nonce) {
                styleQueue$jscomp$0.hrefs.push(escapeTextForBrowser(href$jscomp$0));
                var target = styleQueue$jscomp$0.rules, children$jscomp$7 = null, innerHTML$jscomp$6 = null, propKey$jscomp$9;
                for (propKey$jscomp$9 in props)
                  if (hasOwnProperty.call(props, propKey$jscomp$9)) {
                    var propValue$jscomp$9 = props[propKey$jscomp$9];
                    if (null != propValue$jscomp$9)
                      switch (propKey$jscomp$9) {
                        case "children":
                          children$jscomp$7 = propValue$jscomp$9;
                          break;
                        case "dangerouslySetInnerHTML":
                          innerHTML$jscomp$6 = propValue$jscomp$9;
                      }
                  }
                var child$jscomp$0 = Array.isArray(children$jscomp$7) ? 2 > children$jscomp$7.length ? children$jscomp$7[0] : null : children$jscomp$7;
                "function" !== typeof child$jscomp$0 && "symbol" !== typeof child$jscomp$0 && null !== child$jscomp$0 && void 0 !== child$jscomp$0 && target.push(
                  ("" + child$jscomp$0).replace(styleRegex, styleReplacer)
                );
                pushInnerHTML(target, innerHTML$jscomp$6, children$jscomp$7);
              }
            }
            styleQueue$jscomp$0 && hoistableState && hoistableState.styles.add(styleQueue$jscomp$0);
            textEmbedded && target$jscomp$0.push(textSeparator);
            JSCompiler_inline_result$jscomp$6 = void 0;
          }
          return JSCompiler_inline_result$jscomp$6;
        case "meta":
          var noscriptTagInScope$jscomp$3 = formatContext.tagScope & 1, isFallback$jscomp$1 = formatContext.tagScope & 4;
          if (4 === formatContext.insertionMode || noscriptTagInScope$jscomp$3 || null != props.itemProp)
            var JSCompiler_inline_result$jscomp$7 = pushSelfClosing(
              target$jscomp$0,
              props,
              "meta"
            );
          else
            textEmbedded && target$jscomp$0.push(textSeparator), JSCompiler_inline_result$jscomp$7 = isFallback$jscomp$1 ? null : "string" === typeof props.charSet ? pushSelfClosing(renderState.charsetChunks, props, "meta") : "viewport" === props.name ? pushSelfClosing(renderState.viewportChunks, props, "meta") : pushSelfClosing(renderState.hoistableChunks, props, "meta");
          return JSCompiler_inline_result$jscomp$7;
        case "listing":
        case "pre":
          target$jscomp$0.push(startChunkForTag(type));
          var children$jscomp$8 = null, innerHTML$jscomp$7 = null, propKey$jscomp$10;
          for (propKey$jscomp$10 in props)
            if (hasOwnProperty.call(props, propKey$jscomp$10)) {
              var propValue$jscomp$10 = props[propKey$jscomp$10];
              if (null != propValue$jscomp$10)
                switch (propKey$jscomp$10) {
                  case "children":
                    children$jscomp$8 = propValue$jscomp$10;
                    break;
                  case "dangerouslySetInnerHTML":
                    innerHTML$jscomp$7 = propValue$jscomp$10;
                    break;
                  default:
                    pushAttribute(
                      target$jscomp$0,
                      propKey$jscomp$10,
                      propValue$jscomp$10
                    );
                }
            }
          target$jscomp$0.push(endOfStartTag);
          if (null != innerHTML$jscomp$7) {
            if (null != children$jscomp$8)
              throw Error(
                "Can only set one of `children` or `props.dangerouslySetInnerHTML`."
              );
            if ("object" !== typeof innerHTML$jscomp$7 || !("__html" in innerHTML$jscomp$7))
              throw Error(
                "`props.dangerouslySetInnerHTML` must be in the form `{__html: ...}`. Please visit https://react.dev/link/dangerously-set-inner-html for more information."
              );
            var html = innerHTML$jscomp$7.__html;
            null !== html && void 0 !== html && ("string" === typeof html && 0 < html.length && "\n" === html[0] ? target$jscomp$0.push(leadingNewline, html) : target$jscomp$0.push("" + html));
          }
          "string" === typeof children$jscomp$8 && "\n" === children$jscomp$8[0] && target$jscomp$0.push(leadingNewline);
          return children$jscomp$8;
        case "img":
          var pictureOrNoScriptTagInScope = formatContext.tagScope & 3, src = props.src, srcSet = props.srcSet;
          if (!("lazy" === props.loading || !src && !srcSet || "string" !== typeof src && null != src || "string" !== typeof srcSet && null != srcSet || "low" === props.fetchPriority || pictureOrNoScriptTagInScope) && ("string" !== typeof src || ":" !== src[4] || "d" !== src[0] && "D" !== src[0] || "a" !== src[1] && "A" !== src[1] || "t" !== src[2] && "T" !== src[2] || "a" !== src[3] && "A" !== src[3]) && ("string" !== typeof srcSet || ":" !== srcSet[4] || "d" !== srcSet[0] && "D" !== srcSet[0] || "a" !== srcSet[1] && "A" !== srcSet[1] || "t" !== srcSet[2] && "T" !== srcSet[2] || "a" !== srcSet[3] && "A" !== srcSet[3])) {
            null !== hoistableState && formatContext.tagScope & 64 && (hoistableState.suspenseyImages = true);
            var sizes = "string" === typeof props.sizes ? props.sizes : void 0, key$jscomp$0 = srcSet ? srcSet + "\n" + (sizes || "") : src, promotablePreloads = renderState.preloads.images, resource$jscomp$1 = promotablePreloads.get(key$jscomp$0);
            if (resource$jscomp$1) {
              if ("high" === props.fetchPriority || 10 > renderState.highImagePreloads.size)
                promotablePreloads.delete(key$jscomp$0), renderState.highImagePreloads.add(resource$jscomp$1);
            } else if (!resumableState.imageResources.hasOwnProperty(key$jscomp$0)) {
              resumableState.imageResources[key$jscomp$0] = PRELOAD_NO_CREDS;
              var input = props.crossOrigin;
              var JSCompiler_inline_result$jscomp$8 = "string" === typeof input ? "use-credentials" === input ? input : "" : void 0;
              var headers = renderState.headers, header;
              headers && 0 < headers.remainingCapacity && "string" !== typeof props.srcSet && ("high" === props.fetchPriority || 500 > headers.highImagePreloads.length) && (header = getPreloadAsHeader(src, "image", {
                imageSrcSet: props.srcSet,
                imageSizes: props.sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                nonce: props.nonce,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.refererPolicy
              }), 0 <= (headers.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key$jscomp$0] = PRELOAD_NO_CREDS, headers.highImagePreloads && (headers.highImagePreloads += ", "), headers.highImagePreloads += header) : (resource$jscomp$1 = [], pushLinkImpl(resource$jscomp$1, {
                rel: "preload",
                as: "image",
                href: srcSet ? void 0 : src,
                imageSrcSet: srcSet,
                imageSizes: sizes,
                crossOrigin: JSCompiler_inline_result$jscomp$8,
                integrity: props.integrity,
                type: props.type,
                fetchPriority: props.fetchPriority,
                referrerPolicy: props.referrerPolicy
              }), "high" === props.fetchPriority || 10 > renderState.highImagePreloads.size ? renderState.highImagePreloads.add(resource$jscomp$1) : (renderState.bulkPreloads.add(resource$jscomp$1), promotablePreloads.set(key$jscomp$0, resource$jscomp$1)));
            }
          }
          return pushSelfClosing(target$jscomp$0, props, "img");
        case "base":
        case "area":
        case "br":
        case "col":
        case "embed":
        case "hr":
        case "keygen":
        case "param":
        case "source":
        case "track":
        case "wbr":
          return pushSelfClosing(target$jscomp$0, props, type);
        case "annotation-xml":
        case "color-profile":
        case "font-face":
        case "font-face-src":
        case "font-face-uri":
        case "font-face-format":
        case "font-face-name":
        case "missing-glyph":
          break;
        case "head":
          if (2 > formatContext.insertionMode) {
            var preamble = preambleState || renderState.preamble;
            if (preamble.headChunks)
              throw Error("The `<head>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push(headPreambleContributionChunk);
            preamble.headChunks = [];
            var JSCompiler_inline_result$jscomp$9 = pushStartSingletonElement(
              preamble.headChunks,
              props,
              "head"
            );
          } else
            JSCompiler_inline_result$jscomp$9 = pushStartGenericElement(
              target$jscomp$0,
              props,
              "head"
            );
          return JSCompiler_inline_result$jscomp$9;
        case "body":
          if (2 > formatContext.insertionMode) {
            var preamble$jscomp$0 = preambleState || renderState.preamble;
            if (preamble$jscomp$0.bodyChunks)
              throw Error("The `<body>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push(bodyPreambleContributionChunk);
            preamble$jscomp$0.bodyChunks = [];
            var JSCompiler_inline_result$jscomp$10 = pushStartSingletonElement(
              preamble$jscomp$0.bodyChunks,
              props,
              "body"
            );
          } else
            JSCompiler_inline_result$jscomp$10 = pushStartGenericElement(
              target$jscomp$0,
              props,
              "body"
            );
          return JSCompiler_inline_result$jscomp$10;
        case "html":
          if (0 === formatContext.insertionMode) {
            var preamble$jscomp$1 = preambleState || renderState.preamble;
            if (preamble$jscomp$1.htmlChunks)
              throw Error("The `<html>` tag may only be rendered once.");
            null !== preambleState && target$jscomp$0.push(htmlPreambleContributionChunk);
            preamble$jscomp$1.htmlChunks = [doctypeChunk];
            var JSCompiler_inline_result$jscomp$11 = pushStartSingletonElement(
              preamble$jscomp$1.htmlChunks,
              props,
              "html"
            );
          } else
            JSCompiler_inline_result$jscomp$11 = pushStartGenericElement(
              target$jscomp$0,
              props,
              "html"
            );
          return JSCompiler_inline_result$jscomp$11;
        default:
          if (-1 !== type.indexOf("-")) {
            target$jscomp$0.push(startChunkForTag(type));
            var children$jscomp$9 = null, innerHTML$jscomp$8 = null, propKey$jscomp$11;
            for (propKey$jscomp$11 in props)
              if (hasOwnProperty.call(props, propKey$jscomp$11)) {
                var propValue$jscomp$11 = props[propKey$jscomp$11];
                if (null != propValue$jscomp$11) {
                  var attributeName = propKey$jscomp$11;
                  switch (propKey$jscomp$11) {
                    case "children":
                      children$jscomp$9 = propValue$jscomp$11;
                      break;
                    case "dangerouslySetInnerHTML":
                      innerHTML$jscomp$8 = propValue$jscomp$11;
                      break;
                    case "style":
                      pushStyleAttribute(target$jscomp$0, propValue$jscomp$11);
                      break;
                    case "suppressContentEditableWarning":
                    case "suppressHydrationWarning":
                    case "ref":
                      break;
                    case "className":
                      attributeName = "class";
                    default:
                      if (isAttributeNameSafe(propKey$jscomp$11) && "function" !== typeof propValue$jscomp$11 && "symbol" !== typeof propValue$jscomp$11 && false !== propValue$jscomp$11) {
                        if (true === propValue$jscomp$11) propValue$jscomp$11 = "";
                        else if ("object" === typeof propValue$jscomp$11) continue;
                        target$jscomp$0.push(
                          attributeSeparator,
                          attributeName,
                          attributeAssign,
                          escapeTextForBrowser(propValue$jscomp$11),
                          attributeEnd
                        );
                      }
                  }
                }
              }
            target$jscomp$0.push(endOfStartTag);
            pushInnerHTML(target$jscomp$0, innerHTML$jscomp$8, children$jscomp$9);
            return children$jscomp$9;
          }
      }
      return pushStartGenericElement(target$jscomp$0, props, type);
    }
    var endTagCache = /* @__PURE__ */ new Map();
    function endChunkForTag(tag) {
      var chunk = endTagCache.get(tag);
      void 0 === chunk && (chunk = stringToPrecomputedChunk("</" + tag + ">"), endTagCache.set(tag, chunk));
      return chunk;
    }
    function hoistPreambleState(renderState, preambleState) {
      renderState = renderState.preamble;
      null === renderState.htmlChunks && preambleState.htmlChunks && (renderState.htmlChunks = preambleState.htmlChunks);
      null === renderState.headChunks && preambleState.headChunks && (renderState.headChunks = preambleState.headChunks);
      null === renderState.bodyChunks && preambleState.bodyChunks && (renderState.bodyChunks = preambleState.bodyChunks);
    }
    function writeBootstrap(destination, renderState) {
      renderState = renderState.bootstrapChunks;
      for (var i = 0; i < renderState.length - 1; i++)
        writeChunk(destination, renderState[i]);
      return i < renderState.length ? (i = renderState[i], renderState.length = 0, writeChunkAndReturn(destination, i)) : true;
    }
    var shellTimeRuntimeScript = stringToPrecomputedChunk(
      "requestAnimationFrame(function(){$RT=performance.now()});"
    );
    var placeholder1 = stringToPrecomputedChunk('<template id="');
    var placeholder2 = stringToPrecomputedChunk('"></template>');
    var startActivityBoundary = stringToPrecomputedChunk("<!--&-->");
    var endActivityBoundary = stringToPrecomputedChunk("<!--/&-->");
    var startCompletedSuspenseBoundary = stringToPrecomputedChunk("<!--$-->");
    var startPendingSuspenseBoundary1 = stringToPrecomputedChunk(
      '<!--$?--><template id="'
    );
    var startPendingSuspenseBoundary2 = stringToPrecomputedChunk('"></template>');
    var startClientRenderedSuspenseBoundary = stringToPrecomputedChunk("<!--$!-->");
    var endSuspenseBoundary = stringToPrecomputedChunk("<!--/$-->");
    var clientRenderedSuspenseBoundaryError1 = stringToPrecomputedChunk("<template");
    var clientRenderedSuspenseBoundaryErrorAttrInterstitial = stringToPrecomputedChunk('"');
    var clientRenderedSuspenseBoundaryError1A = stringToPrecomputedChunk(' data-dgst="');
    stringToPrecomputedChunk(' data-msg="');
    stringToPrecomputedChunk(' data-stck="');
    stringToPrecomputedChunk(' data-cstck="');
    var clientRenderedSuspenseBoundaryError2 = stringToPrecomputedChunk("></template>");
    function writeStartPendingSuspenseBoundary(destination, renderState, id) {
      writeChunk(destination, startPendingSuspenseBoundary1);
      if (null === id)
        throw Error(
          "An ID must have been assigned before we can complete the boundary."
        );
      writeChunk(destination, renderState.boundaryPrefix);
      writeChunk(destination, id.toString(16));
      return writeChunkAndReturn(destination, startPendingSuspenseBoundary2);
    }
    var startSegmentHTML = stringToPrecomputedChunk('<div hidden id="');
    var startSegmentHTML2 = stringToPrecomputedChunk('">');
    var endSegmentHTML = stringToPrecomputedChunk("</div>");
    var startSegmentSVG = stringToPrecomputedChunk(
      '<svg aria-hidden="true" style="display:none" id="'
    );
    var startSegmentSVG2 = stringToPrecomputedChunk('">');
    var endSegmentSVG = stringToPrecomputedChunk("</svg>");
    var startSegmentMathML = stringToPrecomputedChunk(
      '<math aria-hidden="true" style="display:none" id="'
    );
    var startSegmentMathML2 = stringToPrecomputedChunk('">');
    var endSegmentMathML = stringToPrecomputedChunk("</math>");
    var startSegmentTable = stringToPrecomputedChunk('<table hidden id="');
    var startSegmentTable2 = stringToPrecomputedChunk('">');
    var endSegmentTable = stringToPrecomputedChunk("</table>");
    var startSegmentTableBody = stringToPrecomputedChunk('<table hidden><tbody id="');
    var startSegmentTableBody2 = stringToPrecomputedChunk('">');
    var endSegmentTableBody = stringToPrecomputedChunk("</tbody></table>");
    var startSegmentTableRow = stringToPrecomputedChunk('<table hidden><tr id="');
    var startSegmentTableRow2 = stringToPrecomputedChunk('">');
    var endSegmentTableRow = stringToPrecomputedChunk("</tr></table>");
    var startSegmentColGroup = stringToPrecomputedChunk(
      '<table hidden><colgroup id="'
    );
    var startSegmentColGroup2 = stringToPrecomputedChunk('">');
    var endSegmentColGroup = stringToPrecomputedChunk("</colgroup></table>");
    function writeStartSegment(destination, renderState, formatContext, id) {
      switch (formatContext.insertionMode) {
        case 0:
        case 1:
        case 3:
        case 2:
          return writeChunk(destination, startSegmentHTML), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentHTML2);
        case 4:
          return writeChunk(destination, startSegmentSVG), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentSVG2);
        case 5:
          return writeChunk(destination, startSegmentMathML), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentMathML2);
        case 6:
          return writeChunk(destination, startSegmentTable), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentTable2);
        case 7:
          return writeChunk(destination, startSegmentTableBody), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentTableBody2);
        case 8:
          return writeChunk(destination, startSegmentTableRow), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentTableRow2);
        case 9:
          return writeChunk(destination, startSegmentColGroup), writeChunk(destination, renderState.segmentPrefix), writeChunk(destination, id.toString(16)), writeChunkAndReturn(destination, startSegmentColGroup2);
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    function writeEndSegment(destination, formatContext) {
      switch (formatContext.insertionMode) {
        case 0:
        case 1:
        case 3:
        case 2:
          return writeChunkAndReturn(destination, endSegmentHTML);
        case 4:
          return writeChunkAndReturn(destination, endSegmentSVG);
        case 5:
          return writeChunkAndReturn(destination, endSegmentMathML);
        case 6:
          return writeChunkAndReturn(destination, endSegmentTable);
        case 7:
          return writeChunkAndReturn(destination, endSegmentTableBody);
        case 8:
          return writeChunkAndReturn(destination, endSegmentTableRow);
        case 9:
          return writeChunkAndReturn(destination, endSegmentColGroup);
        default:
          throw Error("Unknown insertion mode. This is a bug in React.");
      }
    }
    var completeSegmentScript1Full = stringToPrecomputedChunk(
      '$RS=function(a,b){a=document.getElementById(a);b=document.getElementById(b);for(a.parentNode.removeChild(a);a.firstChild;)b.parentNode.insertBefore(a.firstChild,b);b.parentNode.removeChild(b)};$RS("'
    );
    var completeSegmentScript1Partial = stringToPrecomputedChunk('$RS("');
    var completeSegmentScript2 = stringToPrecomputedChunk('","');
    var completeSegmentScriptEnd = stringToPrecomputedChunk('")</script>');
    stringToPrecomputedChunk('<template data-rsi="" data-sid="');
    stringToPrecomputedChunk('" data-pid="');
    var completeBoundaryScriptFunctionOnly = stringToPrecomputedChunk(
      '$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};\n$RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};'
    );
    var completeBoundaryScript1Partial = stringToPrecomputedChunk('$RC("');
    var completeBoundaryWithStylesScript1FullPartial = stringToPrecomputedChunk(
      '$RM=new Map;$RR=function(n,w,p){function u(q){this._p=null;q()}for(var r=new Map,t=document,h,b,e=t.querySelectorAll("link[data-precedence],style[data-precedence]"),v=[],k=0;b=e[k++];)"not all"===b.getAttribute("media")?v.push(b):("LINK"===b.tagName&&$RM.set(b.getAttribute("href"),b),r.set(b.dataset.precedence,h=b));e=0;b=[];var l,a;for(k=!0;;){if(k){var f=p[e++];if(!f){k=!1;e=0;continue}var c=!1,m=0;var d=f[m++];if(a=$RM.get(d)){var g=a._p;c=!0}else{a=t.createElement("link");a.href=d;a.rel=\n"stylesheet";for(a.dataset.precedence=l=f[m++];g=f[m++];)a.setAttribute(g,f[m++]);g=a._p=new Promise(function(q,x){a.onload=u.bind(a,q);a.onerror=u.bind(a,x)});$RM.set(d,a)}d=a.getAttribute("media");!g||d&&!matchMedia(d).matches||b.push(g);if(c)continue}else{a=v[e++];if(!a)break;l=a.getAttribute("data-precedence");a.removeAttribute("media")}c=r.get(l)||h;c===h&&(h=a);r.set(l,a);c?c.parentNode.insertBefore(a,c.nextSibling):(c=t.head,c.insertBefore(a,c.firstChild))}if(p=document.getElementById(n))p.previousSibling.data=\n"$~";Promise.all(b).then($RC.bind(null,n,w),$RX.bind(null,n,"CSS failed to load"))};$RR("'
    );
    var completeBoundaryWithStylesScript1Partial = stringToPrecomputedChunk('$RR("');
    var completeBoundaryScript2 = stringToPrecomputedChunk('","');
    var completeBoundaryScript3a = stringToPrecomputedChunk('",');
    var completeBoundaryScript3b = stringToPrecomputedChunk('"');
    var completeBoundaryScriptEnd = stringToPrecomputedChunk(")</script>");
    stringToPrecomputedChunk('<template data-rci="" data-bid="');
    stringToPrecomputedChunk('<template data-rri="" data-bid="');
    stringToPrecomputedChunk('" data-sid="');
    stringToPrecomputedChunk('" data-sty="');
    var clientRenderScriptFunctionOnly = stringToPrecomputedChunk(
      '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};'
    );
    var clientRenderScript1Full = stringToPrecomputedChunk(
      '$RX=function(b,c,d,e,f){var a=document.getElementById(b);a&&(b=a.previousSibling,b.data="$!",a=a.dataset,c&&(a.dgst=c),d&&(a.msg=d),e&&(a.stck=e),f&&(a.cstck=f),b._reactRetry&&b._reactRetry())};;$RX("'
    );
    var clientRenderScript1Partial = stringToPrecomputedChunk('$RX("');
    var clientRenderScript1A = stringToPrecomputedChunk('"');
    var clientRenderErrorScriptArgInterstitial = stringToPrecomputedChunk(",");
    var clientRenderScriptEnd = stringToPrecomputedChunk(")</script>");
    stringToPrecomputedChunk('<template data-rxi="" data-bid="');
    stringToPrecomputedChunk('" data-dgst="');
    stringToPrecomputedChunk('" data-msg="');
    stringToPrecomputedChunk('" data-stck="');
    stringToPrecomputedChunk('" data-cstck="');
    var regexForJSStringsInInstructionScripts = /[<\u2028\u2029]/g;
    function escapeJSStringsForInstructionScripts(input) {
      return JSON.stringify(input).replace(
        regexForJSStringsInInstructionScripts,
        function(match) {
          switch (match) {
            case "<":
              return "\\u003c";
            case "\u2028":
              return "\\u2028";
            case "\u2029":
              return "\\u2029";
            default:
              throw Error(
                "escapeJSStringsForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
              );
          }
        }
      );
    }
    var regexForJSStringsInScripts = /[&><\u2028\u2029]/g;
    function escapeJSObjectForInstructionScripts(input) {
      return JSON.stringify(input).replace(
        regexForJSStringsInScripts,
        function(match) {
          switch (match) {
            case "&":
              return "\\u0026";
            case ">":
              return "\\u003e";
            case "<":
              return "\\u003c";
            case "\u2028":
              return "\\u2028";
            case "\u2029":
              return "\\u2029";
            default:
              throw Error(
                "escapeJSObjectForInstructionScripts encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
              );
          }
        }
      );
    }
    var lateStyleTagResourceOpen1 = stringToPrecomputedChunk(
      ' media="not all" data-precedence="'
    );
    var lateStyleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="');
    var lateStyleTagResourceOpen3 = stringToPrecomputedChunk('">');
    var lateStyleTagTemplateClose = stringToPrecomputedChunk("</style>");
    var currentlyRenderingBoundaryHasStylesToHoist = false;
    var destinationHasCapacity = true;
    function flushStyleTagsLateForBoundary(styleQueue) {
      var rules = styleQueue.rules, hrefs = styleQueue.hrefs, i = 0;
      if (hrefs.length) {
        writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
        writeChunk(this, lateStyleTagResourceOpen1);
        writeChunk(this, styleQueue.precedence);
        for (writeChunk(this, lateStyleTagResourceOpen2); i < hrefs.length - 1; i++)
          writeChunk(this, hrefs[i]), writeChunk(this, spaceSeparator);
        writeChunk(this, hrefs[i]);
        writeChunk(this, lateStyleTagResourceOpen3);
        for (i = 0; i < rules.length; i++) writeChunk(this, rules[i]);
        destinationHasCapacity = writeChunkAndReturn(
          this,
          lateStyleTagTemplateClose
        );
        currentlyRenderingBoundaryHasStylesToHoist = true;
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function hasStylesToHoist(stylesheet) {
      return 2 !== stylesheet.state ? currentlyRenderingBoundaryHasStylesToHoist = true : false;
    }
    function writeHoistablesForBoundary(destination, hoistableState, renderState) {
      currentlyRenderingBoundaryHasStylesToHoist = false;
      destinationHasCapacity = true;
      currentlyFlushingRenderState = renderState;
      hoistableState.styles.forEach(flushStyleTagsLateForBoundary, destination);
      currentlyFlushingRenderState = null;
      hoistableState.stylesheets.forEach(hasStylesToHoist);
      currentlyRenderingBoundaryHasStylesToHoist && (renderState.stylesToHoist = true);
      return destinationHasCapacity;
    }
    function flushResource(resource) {
      for (var i = 0; i < resource.length; i++) writeChunk(this, resource[i]);
      resource.length = 0;
    }
    var stylesheetFlushingQueue = [];
    function flushStyleInPreamble(stylesheet) {
      pushLinkImpl(stylesheetFlushingQueue, stylesheet.props);
      for (var i = 0; i < stylesheetFlushingQueue.length; i++)
        writeChunk(this, stylesheetFlushingQueue[i]);
      stylesheetFlushingQueue.length = 0;
      stylesheet.state = 2;
    }
    var styleTagResourceOpen1 = stringToPrecomputedChunk(' data-precedence="');
    var styleTagResourceOpen2 = stringToPrecomputedChunk('" data-href="');
    var spaceSeparator = stringToPrecomputedChunk(" ");
    var styleTagResourceOpen3 = stringToPrecomputedChunk('">');
    var styleTagResourceClose = stringToPrecomputedChunk("</style>");
    function flushStylesInPreamble(styleQueue) {
      var hasStylesheets = 0 < styleQueue.sheets.size;
      styleQueue.sheets.forEach(flushStyleInPreamble, this);
      styleQueue.sheets.clear();
      var rules = styleQueue.rules, hrefs = styleQueue.hrefs;
      if (!hasStylesheets || hrefs.length) {
        writeChunk(this, currentlyFlushingRenderState.startInlineStyle);
        writeChunk(this, styleTagResourceOpen1);
        writeChunk(this, styleQueue.precedence);
        styleQueue = 0;
        if (hrefs.length) {
          for (writeChunk(this, styleTagResourceOpen2); styleQueue < hrefs.length - 1; styleQueue++)
            writeChunk(this, hrefs[styleQueue]), writeChunk(this, spaceSeparator);
          writeChunk(this, hrefs[styleQueue]);
        }
        writeChunk(this, styleTagResourceOpen3);
        for (styleQueue = 0; styleQueue < rules.length; styleQueue++)
          writeChunk(this, rules[styleQueue]);
        writeChunk(this, styleTagResourceClose);
        rules.length = 0;
        hrefs.length = 0;
      }
    }
    function preloadLateStyle(stylesheet) {
      if (0 === stylesheet.state) {
        stylesheet.state = 1;
        var props = stylesheet.props;
        pushLinkImpl(stylesheetFlushingQueue, {
          rel: "preload",
          as: "style",
          href: stylesheet.props.href,
          crossOrigin: props.crossOrigin,
          fetchPriority: props.fetchPriority,
          integrity: props.integrity,
          media: props.media,
          hrefLang: props.hrefLang,
          referrerPolicy: props.referrerPolicy
        });
        for (stylesheet = 0; stylesheet < stylesheetFlushingQueue.length; stylesheet++)
          writeChunk(this, stylesheetFlushingQueue[stylesheet]);
        stylesheetFlushingQueue.length = 0;
      }
    }
    function preloadLateStyles(styleQueue) {
      styleQueue.sheets.forEach(preloadLateStyle, this);
      styleQueue.sheets.clear();
    }
    stringToPrecomputedChunk('<link rel="expect" href="#');
    stringToPrecomputedChunk('" blocking="render"/>');
    var completedShellIdAttributeStart = stringToPrecomputedChunk(' id="');
    function pushCompletedShellIdAttribute(target, resumableState) {
      0 === (resumableState.instructions & 32) && (resumableState.instructions |= 32, target.push(
        completedShellIdAttributeStart,
        escapeTextForBrowser("_" + resumableState.idPrefix + "R_"),
        attributeEnd
      ));
    }
    var arrayFirstOpenBracket = stringToPrecomputedChunk("[");
    var arraySubsequentOpenBracket = stringToPrecomputedChunk(",[");
    var arrayInterstitial = stringToPrecomputedChunk(",");
    var arrayCloseBracket = stringToPrecomputedChunk("]");
    function writeStyleResourceDependenciesInJS(destination, hoistableState) {
      writeChunk(destination, arrayFirstOpenBracket);
      var nextArrayOpenBrackChunk = arrayFirstOpenBracket;
      hoistableState.stylesheets.forEach(function(resource) {
        if (2 !== resource.state)
          if (3 === resource.state)
            writeChunk(destination, nextArrayOpenBrackChunk), writeChunk(
              destination,
              escapeJSObjectForInstructionScripts("" + resource.props.href)
            ), writeChunk(destination, arrayCloseBracket), nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
          else {
            writeChunk(destination, nextArrayOpenBrackChunk);
            var precedence = resource.props["data-precedence"], props = resource.props, coercedHref = sanitizeURL("" + resource.props.href);
            writeChunk(
              destination,
              escapeJSObjectForInstructionScripts(coercedHref)
            );
            precedence = "" + precedence;
            writeChunk(destination, arrayInterstitial);
            writeChunk(
              destination,
              escapeJSObjectForInstructionScripts(precedence)
            );
            for (var propKey in props)
              if (hasOwnProperty.call(props, propKey) && (precedence = props[propKey], null != precedence))
                switch (propKey) {
                  case "href":
                  case "rel":
                  case "precedence":
                  case "data-precedence":
                    break;
                  case "children":
                  case "dangerouslySetInnerHTML":
                    throw Error(
                      "link is a self-closing tag and must neither have `children` nor use `dangerouslySetInnerHTML`."
                    );
                  default:
                    writeStyleResourceAttributeInJS(
                      destination,
                      propKey,
                      precedence
                    );
                }
            writeChunk(destination, arrayCloseBracket);
            nextArrayOpenBrackChunk = arraySubsequentOpenBracket;
            resource.state = 3;
          }
      });
      writeChunk(destination, arrayCloseBracket);
    }
    function writeStyleResourceAttributeInJS(destination, name, value) {
      var attributeName = name.toLowerCase();
      switch (typeof value) {
        case "function":
        case "symbol":
          return;
      }
      switch (name) {
        case "innerHTML":
        case "dangerouslySetInnerHTML":
        case "suppressContentEditableWarning":
        case "suppressHydrationWarning":
        case "style":
        case "ref":
          return;
        case "className":
          attributeName = "class";
          name = "" + value;
          break;
        case "hidden":
          if (false === value) return;
          name = "";
          break;
        case "src":
        case "href":
          value = sanitizeURL(value);
          name = "" + value;
          break;
        default:
          if (2 < name.length && ("o" === name[0] || "O" === name[0]) && ("n" === name[1] || "N" === name[1]) || !isAttributeNameSafe(name))
            return;
          name = "" + value;
      }
      writeChunk(destination, arrayInterstitial);
      writeChunk(destination, escapeJSObjectForInstructionScripts(attributeName));
      writeChunk(destination, arrayInterstitial);
      writeChunk(destination, escapeJSObjectForInstructionScripts(name));
    }
    function createHoistableState() {
      return { styles: /* @__PURE__ */ new Set(), stylesheets: /* @__PURE__ */ new Set(), suspenseyImages: false };
    }
    function prefetchDNS(href) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if ("string" === typeof href && href) {
          if (!resumableState.dnsResources.hasOwnProperty(href)) {
            resumableState.dnsResources[href] = null;
            resumableState = renderState.headers;
            var header, JSCompiler_temp;
            if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity)
              JSCompiler_temp = (header = "<" + ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) + ">; rel=dns-prefetch", 0 <= (resumableState.remainingCapacity -= header.length + 2));
            JSCompiler_temp ? (renderState.resets.dns[href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (header = [], pushLinkImpl(header, { href, rel: "dns-prefetch" }), renderState.preconnects.add(header));
          }
          enqueueFlush(request);
        }
      } else previousDispatcher.D(href);
    }
    function preconnect(href, crossOrigin) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if ("string" === typeof href && href) {
          var bucket = "use-credentials" === crossOrigin ? "credentials" : "string" === typeof crossOrigin ? "anonymous" : "default";
          if (!resumableState.connectResources[bucket].hasOwnProperty(href)) {
            resumableState.connectResources[bucket][href] = null;
            resumableState = renderState.headers;
            var header, JSCompiler_temp;
            if (JSCompiler_temp = resumableState && 0 < resumableState.remainingCapacity) {
              JSCompiler_temp = "<" + ("" + href).replace(
                regexForHrefInLinkHeaderURLContext,
                escapeHrefForLinkHeaderURLContextReplacer
              ) + ">; rel=preconnect";
              if ("string" === typeof crossOrigin) {
                var escapedCrossOrigin = ("" + crossOrigin).replace(
                  regexForLinkHeaderQuotedParamValueContext,
                  escapeStringForLinkHeaderQuotedParamValueContextReplacer
                );
                JSCompiler_temp += '; crossorigin="' + escapedCrossOrigin + '"';
              }
              JSCompiler_temp = (header = JSCompiler_temp, 0 <= (resumableState.remainingCapacity -= header.length + 2));
            }
            JSCompiler_temp ? (renderState.resets.connect[bucket][href] = null, resumableState.preconnects && (resumableState.preconnects += ", "), resumableState.preconnects += header) : (bucket = [], pushLinkImpl(bucket, {
              rel: "preconnect",
              href,
              crossOrigin
            }), renderState.preconnects.add(bucket));
          }
          enqueueFlush(request);
        }
      } else previousDispatcher.C(href, crossOrigin);
    }
    function preload(href, as, options) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (as && href) {
          switch (as) {
            case "image":
              if (options) {
                var imageSrcSet = options.imageSrcSet;
                var imageSizes = options.imageSizes;
                var fetchPriority = options.fetchPriority;
              }
              var key = imageSrcSet ? imageSrcSet + "\n" + (imageSizes || "") : href;
              if (resumableState.imageResources.hasOwnProperty(key)) return;
              resumableState.imageResources[key] = PRELOAD_NO_CREDS;
              resumableState = renderState.headers;
              var header;
              resumableState && 0 < resumableState.remainingCapacity && "string" !== typeof imageSrcSet && "high" === fetchPriority && (header = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= header.length + 2)) ? (renderState.resets.image[key] = PRELOAD_NO_CREDS, resumableState.highImagePreloads && (resumableState.highImagePreloads += ", "), resumableState.highImagePreloads += header) : (resumableState = [], pushLinkImpl(
                resumableState,
                assign(
                  { rel: "preload", href: imageSrcSet ? void 0 : href, as },
                  options
                )
              ), "high" === fetchPriority ? renderState.highImagePreloads.add(resumableState) : (renderState.bulkPreloads.add(resumableState), renderState.preloads.images.set(key, resumableState)));
              break;
            case "style":
              if (resumableState.styleResources.hasOwnProperty(href)) return;
              imageSrcSet = [];
              pushLinkImpl(
                imageSrcSet,
                assign({ rel: "preload", href, as }, options)
              );
              resumableState.styleResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
              renderState.preloads.stylesheets.set(href, imageSrcSet);
              renderState.bulkPreloads.add(imageSrcSet);
              break;
            case "script":
              if (resumableState.scriptResources.hasOwnProperty(href)) return;
              imageSrcSet = [];
              renderState.preloads.scripts.set(href, imageSrcSet);
              renderState.bulkPreloads.add(imageSrcSet);
              pushLinkImpl(
                imageSrcSet,
                assign({ rel: "preload", href, as }, options)
              );
              resumableState.scriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
              break;
            default:
              if (resumableState.unknownResources.hasOwnProperty(as)) {
                if (imageSrcSet = resumableState.unknownResources[as], imageSrcSet.hasOwnProperty(href))
                  return;
              } else
                imageSrcSet = {}, resumableState.unknownResources[as] = imageSrcSet;
              imageSrcSet[href] = PRELOAD_NO_CREDS;
              if ((resumableState = renderState.headers) && 0 < resumableState.remainingCapacity && "font" === as && (key = getPreloadAsHeader(href, as, options), 0 <= (resumableState.remainingCapacity -= key.length + 2)))
                renderState.resets.font[href] = PRELOAD_NO_CREDS, resumableState.fontPreloads && (resumableState.fontPreloads += ", "), resumableState.fontPreloads += key;
              else
                switch (resumableState = [], href = assign({ rel: "preload", href, as }, options), pushLinkImpl(resumableState, href), as) {
                  case "font":
                    renderState.fontPreloads.add(resumableState);
                    break;
                  default:
                    renderState.bulkPreloads.add(resumableState);
                }
          }
          enqueueFlush(request);
        }
      } else previousDispatcher.L(href, as, options);
    }
    function preloadModule(href, options) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (href) {
          var as = options && "string" === typeof options.as ? options.as : "script";
          switch (as) {
            case "script":
              if (resumableState.moduleScriptResources.hasOwnProperty(href)) return;
              as = [];
              resumableState.moduleScriptResources[href] = !options || "string" !== typeof options.crossOrigin && "string" !== typeof options.integrity ? PRELOAD_NO_CREDS : [options.crossOrigin, options.integrity];
              renderState.preloads.moduleScripts.set(href, as);
              break;
            default:
              if (resumableState.moduleUnknownResources.hasOwnProperty(as)) {
                var resources = resumableState.unknownResources[as];
                if (resources.hasOwnProperty(href)) return;
              } else
                resources = {}, resumableState.moduleUnknownResources[as] = resources;
              as = [];
              resources[href] = PRELOAD_NO_CREDS;
          }
          pushLinkImpl(as, assign({ rel: "modulepreload", href }, options));
          renderState.bulkPreloads.add(as);
          enqueueFlush(request);
        }
      } else previousDispatcher.m(href, options);
    }
    function preinitStyle(href, precedence, options) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (href) {
          precedence = precedence || "default";
          var styleQueue = renderState.styles.get(precedence), resourceState = resumableState.styleResources.hasOwnProperty(href) ? resumableState.styleResources[href] : void 0;
          null !== resourceState && (resumableState.styleResources[href] = null, styleQueue || (styleQueue = {
            precedence: escapeTextForBrowser(precedence),
            rules: [],
            hrefs: [],
            sheets: /* @__PURE__ */ new Map()
          }, renderState.styles.set(precedence, styleQueue)), precedence = {
            state: 0,
            props: assign(
              { rel: "stylesheet", href, "data-precedence": precedence },
              options
            )
          }, resourceState && (2 === resourceState.length && adoptPreloadCredentials(precedence.props, resourceState), (renderState = renderState.preloads.stylesheets.get(href)) && 0 < renderState.length ? renderState.length = 0 : precedence.state = 1), styleQueue.sheets.set(href, precedence), enqueueFlush(request));
        }
      } else previousDispatcher.S(href, precedence, options);
    }
    function preinitScript(src, options) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (src) {
          var resourceState = resumableState.scriptResources.hasOwnProperty(src) ? resumableState.scriptResources[src] : void 0;
          null !== resourceState && (resumableState.scriptResources[src] = null, options = assign({ src, async: true }, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.scripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
        }
      } else previousDispatcher.X(src, options);
    }
    function preinitModuleScript(src, options) {
      var request = resolveRequest();
      if (request) {
        var resumableState = request.resumableState, renderState = request.renderState;
        if (src) {
          var resourceState = resumableState.moduleScriptResources.hasOwnProperty(
            src
          ) ? resumableState.moduleScriptResources[src] : void 0;
          null !== resourceState && (resumableState.moduleScriptResources[src] = null, options = assign({ src, type: "module", async: true }, options), resourceState && (2 === resourceState.length && adoptPreloadCredentials(options, resourceState), src = renderState.preloads.moduleScripts.get(src)) && (src.length = 0), src = [], renderState.scripts.add(src), pushScriptImpl(src, options), enqueueFlush(request));
        }
      } else previousDispatcher.M(src, options);
    }
    function adoptPreloadCredentials(target, preloadState) {
      null == target.crossOrigin && (target.crossOrigin = preloadState[0]);
      null == target.integrity && (target.integrity = preloadState[1]);
    }
    function getPreloadAsHeader(href, as, params) {
      href = ("" + href).replace(
        regexForHrefInLinkHeaderURLContext,
        escapeHrefForLinkHeaderURLContextReplacer
      );
      as = ("" + as).replace(
        regexForLinkHeaderQuotedParamValueContext,
        escapeStringForLinkHeaderQuotedParamValueContextReplacer
      );
      as = "<" + href + '>; rel=preload; as="' + as + '"';
      for (var paramName in params)
        hasOwnProperty.call(params, paramName) && (href = params[paramName], "string" === typeof href && (as += "; " + paramName.toLowerCase() + '="' + ("" + href).replace(
          regexForLinkHeaderQuotedParamValueContext,
          escapeStringForLinkHeaderQuotedParamValueContextReplacer
        ) + '"'));
      return as;
    }
    var regexForHrefInLinkHeaderURLContext = /[<>\r\n]/g;
    function escapeHrefForLinkHeaderURLContextReplacer(match) {
      switch (match) {
        case "<":
          return "%3C";
        case ">":
          return "%3E";
        case "\n":
          return "%0A";
        case "\r":
          return "%0D";
        default:
          throw Error(
            "escapeLinkHrefForHeaderContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
    var regexForLinkHeaderQuotedParamValueContext = /["';,\r\n]/g;
    function escapeStringForLinkHeaderQuotedParamValueContextReplacer(match) {
      switch (match) {
        case '"':
          return "%22";
        case "'":
          return "%27";
        case ";":
          return "%3B";
        case ",":
          return "%2C";
        case "\n":
          return "%0A";
        case "\r":
          return "%0D";
        default:
          throw Error(
            "escapeStringForLinkHeaderQuotedParamValueContextReplacer encountered a match it does not know how to replace. this means the match regex and the replacement characters are no longer in sync. This is a bug in React"
          );
      }
    }
    function hoistStyleQueueDependency(styleQueue) {
      this.styles.add(styleQueue);
    }
    function hoistStylesheetDependency(stylesheet) {
      this.stylesheets.add(stylesheet);
    }
    function hoistHoistables(parentState, childState) {
      childState.styles.forEach(hoistStyleQueueDependency, parentState);
      childState.stylesheets.forEach(hoistStylesheetDependency, parentState);
      childState.suspenseyImages && (parentState.suspenseyImages = true);
    }
    function hasSuspenseyContent(hoistableState) {
      return 0 < hoistableState.stylesheets.size || hoistableState.suspenseyImages;
    }
    var bind = Function.prototype.bind;
    var requestStorage = new async_hooks.AsyncLocalStorage();
    var REACT_CLIENT_REFERENCE = /* @__PURE__ */ Symbol.for("react.client.reference");
    function getComponentNameFromType(type) {
      if (null == type) return null;
      if ("function" === typeof type)
        return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
      if ("string" === typeof type) return type;
      switch (type) {
        case REACT_FRAGMENT_TYPE:
          return "Fragment";
        case REACT_PROFILER_TYPE:
          return "Profiler";
        case REACT_STRICT_MODE_TYPE:
          return "StrictMode";
        case REACT_SUSPENSE_TYPE:
          return "Suspense";
        case REACT_SUSPENSE_LIST_TYPE:
          return "SuspenseList";
        case REACT_ACTIVITY_TYPE:
          return "Activity";
      }
      if ("object" === typeof type)
        switch (type.$$typeof) {
          case REACT_PORTAL_TYPE:
            return "Portal";
          case REACT_CONTEXT_TYPE:
            return type.displayName || "Context";
          case REACT_CONSUMER_TYPE:
            return (type._context.displayName || "Context") + ".Consumer";
          case REACT_FORWARD_REF_TYPE:
            var innerType = type.render;
            type = type.displayName;
            type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
            return type;
          case REACT_MEMO_TYPE:
            return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
          case REACT_LAZY_TYPE:
            innerType = type._payload;
            type = type._init;
            try {
              return getComponentNameFromType(type(innerType));
            } catch (x) {
            }
        }
      return null;
    }
    var emptyContextObject = {};
    var currentActiveSnapshot = null;
    function popToNearestCommonAncestor(prev, next) {
      if (prev !== next) {
        prev.context._currentValue = prev.parentValue;
        prev = prev.parent;
        var parentNext = next.parent;
        if (null === prev) {
          if (null !== parentNext)
            throw Error(
              "The stacks must reach the root at the same time. This is a bug in React."
            );
        } else {
          if (null === parentNext)
            throw Error(
              "The stacks must reach the root at the same time. This is a bug in React."
            );
          popToNearestCommonAncestor(prev, parentNext);
        }
        next.context._currentValue = next.value;
      }
    }
    function popAllPrevious(prev) {
      prev.context._currentValue = prev.parentValue;
      prev = prev.parent;
      null !== prev && popAllPrevious(prev);
    }
    function pushAllNext(next) {
      var parentNext = next.parent;
      null !== parentNext && pushAllNext(parentNext);
      next.context._currentValue = next.value;
    }
    function popPreviousToCommonLevel(prev, next) {
      prev.context._currentValue = prev.parentValue;
      prev = prev.parent;
      if (null === prev)
        throw Error(
          "The depth must equal at least at zero before reaching the root. This is a bug in React."
        );
      prev.depth === next.depth ? popToNearestCommonAncestor(prev, next) : popPreviousToCommonLevel(prev, next);
    }
    function popNextToCommonLevel(prev, next) {
      var parentNext = next.parent;
      if (null === parentNext)
        throw Error(
          "The depth must equal at least at zero before reaching the root. This is a bug in React."
        );
      prev.depth === parentNext.depth ? popToNearestCommonAncestor(prev, parentNext) : popNextToCommonLevel(prev, parentNext);
      next.context._currentValue = next.value;
    }
    function switchContext(newSnapshot) {
      var prev = currentActiveSnapshot;
      prev !== newSnapshot && (null === prev ? pushAllNext(newSnapshot) : null === newSnapshot ? popAllPrevious(prev) : prev.depth === newSnapshot.depth ? popToNearestCommonAncestor(prev, newSnapshot) : prev.depth > newSnapshot.depth ? popPreviousToCommonLevel(prev, newSnapshot) : popNextToCommonLevel(prev, newSnapshot), currentActiveSnapshot = newSnapshot);
    }
    var classComponentUpdater = {
      enqueueSetState: function(inst, payload) {
        inst = inst._reactInternals;
        null !== inst.queue && inst.queue.push(payload);
      },
      enqueueReplaceState: function(inst, payload) {
        inst = inst._reactInternals;
        inst.replace = true;
        inst.queue = [payload];
      },
      enqueueForceUpdate: function() {
      }
    };
    var emptyTreeContext = { id: 1, overflow: "" };
    function pushTreeContext(baseContext, totalChildren, index) {
      var baseIdWithLeadingBit = baseContext.id;
      baseContext = baseContext.overflow;
      var baseLength = 32 - clz32(baseIdWithLeadingBit) - 1;
      baseIdWithLeadingBit &= ~(1 << baseLength);
      index += 1;
      var length = 32 - clz32(totalChildren) + baseLength;
      if (30 < length) {
        var numberOfOverflowBits = baseLength - baseLength % 5;
        length = (baseIdWithLeadingBit & (1 << numberOfOverflowBits) - 1).toString(32);
        baseIdWithLeadingBit >>= numberOfOverflowBits;
        baseLength -= numberOfOverflowBits;
        return {
          id: 1 << 32 - clz32(totalChildren) + baseLength | index << baseLength | baseIdWithLeadingBit,
          overflow: length + baseContext
        };
      }
      return {
        id: 1 << length | index << baseLength | baseIdWithLeadingBit,
        overflow: baseContext
      };
    }
    var clz32 = Math.clz32 ? Math.clz32 : clz32Fallback;
    var log = Math.log;
    var LN2 = Math.LN2;
    function clz32Fallback(x) {
      x >>>= 0;
      return 0 === x ? 32 : 31 - (log(x) / LN2 | 0) | 0;
    }
    function noop() {
    }
    var SuspenseException = Error(
      "Suspense Exception: This is not a real error! It's an implementation detail of `use` to interrupt the current render. You must either rethrow it immediately, or move the `use` call outside of the `try/catch` block. Capturing without rethrowing will lead to unexpected behavior.\n\nTo handle async errors, wrap your component in an error boundary, or call the promise's `.catch` method and pass the result to `use`."
    );
    function trackUsedThenable(thenableState2, thenable, index) {
      index = thenableState2[index];
      void 0 === index ? thenableState2.push(thenable) : index !== thenable && (thenable.then(noop, noop), thenable = index);
      switch (thenable.status) {
        case "fulfilled":
          return thenable.value;
        case "rejected":
          throw thenable.reason;
        default:
          "string" === typeof thenable.status ? thenable.then(noop, noop) : (thenableState2 = thenable, thenableState2.status = "pending", thenableState2.then(
            function(fulfilledValue) {
              if ("pending" === thenable.status) {
                var fulfilledThenable = thenable;
                fulfilledThenable.status = "fulfilled";
                fulfilledThenable.value = fulfilledValue;
              }
            },
            function(error) {
              if ("pending" === thenable.status) {
                var rejectedThenable = thenable;
                rejectedThenable.status = "rejected";
                rejectedThenable.reason = error;
              }
            }
          ));
          switch (thenable.status) {
            case "fulfilled":
              return thenable.value;
            case "rejected":
              throw thenable.reason;
          }
          suspendedThenable = thenable;
          throw SuspenseException;
      }
    }
    var suspendedThenable = null;
    function getSuspendedThenable() {
      if (null === suspendedThenable)
        throw Error(
          "Expected a suspended thenable. This is a bug in React. Please file an issue."
        );
      var thenable = suspendedThenable;
      suspendedThenable = null;
      return thenable;
    }
    function is(x, y) {
      return x === y && (0 !== x || 1 / x === 1 / y) || x !== x && y !== y;
    }
    var objectIs = "function" === typeof Object.is ? Object.is : is;
    var currentlyRenderingComponent = null;
    var currentlyRenderingTask = null;
    var currentlyRenderingRequest = null;
    var currentlyRenderingKeyPath = null;
    var firstWorkInProgressHook = null;
    var workInProgressHook = null;
    var isReRender = false;
    var didScheduleRenderPhaseUpdate = false;
    var localIdCounter = 0;
    var actionStateCounter = 0;
    var actionStateMatchingIndex = -1;
    var thenableIndexCounter = 0;
    var thenableState = null;
    var renderPhaseUpdates = null;
    var numberOfReRenders = 0;
    function resolveCurrentlyRenderingComponent() {
      if (null === currentlyRenderingComponent)
        throw Error(
          "Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem."
        );
      return currentlyRenderingComponent;
    }
    function createHook() {
      if (0 < numberOfReRenders)
        throw Error("Rendered more hooks than during the previous render");
      return { memoizedState: null, queue: null, next: null };
    }
    function createWorkInProgressHook() {
      null === workInProgressHook ? null === firstWorkInProgressHook ? (isReRender = false, firstWorkInProgressHook = workInProgressHook = createHook()) : (isReRender = true, workInProgressHook = firstWorkInProgressHook) : null === workInProgressHook.next ? (isReRender = false, workInProgressHook = workInProgressHook.next = createHook()) : (isReRender = true, workInProgressHook = workInProgressHook.next);
      return workInProgressHook;
    }
    function getThenableStateAfterSuspending() {
      var state = thenableState;
      thenableState = null;
      return state;
    }
    function resetHooksState() {
      currentlyRenderingKeyPath = currentlyRenderingRequest = currentlyRenderingTask = currentlyRenderingComponent = null;
      didScheduleRenderPhaseUpdate = false;
      firstWorkInProgressHook = null;
      numberOfReRenders = 0;
      workInProgressHook = renderPhaseUpdates = null;
    }
    function basicStateReducer(state, action) {
      return "function" === typeof action ? action(state) : action;
    }
    function useReducer(reducer, initialArg, init) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      if (isReRender) {
        var queue = workInProgressHook.queue;
        initialArg = queue.dispatch;
        if (null !== renderPhaseUpdates && (init = renderPhaseUpdates.get(queue), void 0 !== init)) {
          renderPhaseUpdates.delete(queue);
          queue = workInProgressHook.memoizedState;
          do
            queue = reducer(queue, init.action), init = init.next;
          while (null !== init);
          workInProgressHook.memoizedState = queue;
          return [queue, initialArg];
        }
        return [workInProgressHook.memoizedState, initialArg];
      }
      reducer = reducer === basicStateReducer ? "function" === typeof initialArg ? initialArg() : initialArg : void 0 !== init ? init(initialArg) : initialArg;
      workInProgressHook.memoizedState = reducer;
      reducer = workInProgressHook.queue = { last: null, dispatch: null };
      reducer = reducer.dispatch = dispatchAction.bind(
        null,
        currentlyRenderingComponent,
        reducer
      );
      return [workInProgressHook.memoizedState, reducer];
    }
    function useMemo(nextCreate, deps) {
      currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
      workInProgressHook = createWorkInProgressHook();
      deps = void 0 === deps ? null : deps;
      if (null !== workInProgressHook) {
        var prevState = workInProgressHook.memoizedState;
        if (null !== prevState && null !== deps) {
          var prevDeps = prevState[1];
          a: if (null === prevDeps) prevDeps = false;
          else {
            for (var i = 0; i < prevDeps.length && i < deps.length; i++)
              if (!objectIs(deps[i], prevDeps[i])) {
                prevDeps = false;
                break a;
              }
            prevDeps = true;
          }
          if (prevDeps) return prevState[0];
        }
      }
      nextCreate = nextCreate();
      workInProgressHook.memoizedState = [nextCreate, deps];
      return nextCreate;
    }
    function dispatchAction(componentIdentity, queue, action) {
      if (25 <= numberOfReRenders)
        throw Error(
          "Too many re-renders. React limits the number of renders to prevent an infinite loop."
        );
      if (componentIdentity === currentlyRenderingComponent)
        if (didScheduleRenderPhaseUpdate = true, componentIdentity = { action, next: null }, null === renderPhaseUpdates && (renderPhaseUpdates = /* @__PURE__ */ new Map()), action = renderPhaseUpdates.get(queue), void 0 === action)
          renderPhaseUpdates.set(queue, componentIdentity);
        else {
          for (queue = action; null !== queue.next; ) queue = queue.next;
          queue.next = componentIdentity;
        }
    }
    function throwOnUseEffectEventCall() {
      throw Error(
        "A function wrapped in useEffectEvent can't be called during rendering."
      );
    }
    function unsupportedStartTransition() {
      throw Error("startTransition cannot be called during server rendering.");
    }
    function unsupportedSetOptimisticState() {
      throw Error("Cannot update optimistic state while rendering.");
    }
    function createPostbackActionStateKey(permalink, componentKeyPath, hookIndex) {
      if (void 0 !== permalink) return "p" + permalink;
      permalink = JSON.stringify([componentKeyPath, null, hookIndex]);
      componentKeyPath = crypto.createHash("md5");
      componentKeyPath.update(permalink);
      return "k" + componentKeyPath.digest("hex");
    }
    function useActionState(action, initialState, permalink) {
      resolveCurrentlyRenderingComponent();
      var actionStateHookIndex = actionStateCounter++, request = currentlyRenderingRequest;
      if ("function" === typeof action.$$FORM_ACTION) {
        var nextPostbackStateKey = null, componentKeyPath = currentlyRenderingKeyPath;
        request = request.formState;
        var isSignatureEqual = action.$$IS_SIGNATURE_EQUAL;
        if (null !== request && "function" === typeof isSignatureEqual) {
          var postbackKey = request[1];
          isSignatureEqual.call(action, request[2], request[3]) && (nextPostbackStateKey = createPostbackActionStateKey(
            permalink,
            componentKeyPath,
            actionStateHookIndex
          ), postbackKey === nextPostbackStateKey && (actionStateMatchingIndex = actionStateHookIndex, initialState = request[0]));
        }
        var boundAction = action.bind(null, initialState);
        action = function(payload) {
          boundAction(payload);
        };
        "function" === typeof boundAction.$$FORM_ACTION && (action.$$FORM_ACTION = function(prefix2) {
          prefix2 = boundAction.$$FORM_ACTION(prefix2);
          void 0 !== permalink && (permalink += "", prefix2.action = permalink);
          var formData = prefix2.data;
          formData && (null === nextPostbackStateKey && (nextPostbackStateKey = createPostbackActionStateKey(
            permalink,
            componentKeyPath,
            actionStateHookIndex
          )), formData.append("$ACTION_KEY", nextPostbackStateKey));
          return prefix2;
        });
        return [initialState, action, false];
      }
      var boundAction$22 = action.bind(null, initialState);
      return [
        initialState,
        function(payload) {
          boundAction$22(payload);
        },
        false
      ];
    }
    function unwrapThenable(thenable) {
      var index = thenableIndexCounter;
      thenableIndexCounter += 1;
      null === thenableState && (thenableState = []);
      return trackUsedThenable(thenableState, thenable, index);
    }
    function unsupportedRefresh() {
      throw Error("Cache cannot be refreshed during server rendering.");
    }
    var HooksDispatcher = {
      readContext: function(context) {
        return context._currentValue;
      },
      use: function(usable) {
        if (null !== usable && "object" === typeof usable) {
          if ("function" === typeof usable.then) return unwrapThenable(usable);
          if (usable.$$typeof === REACT_CONTEXT_TYPE) return usable._currentValue;
        }
        throw Error("An unsupported type was passed to use(): " + String(usable));
      },
      useContext: function(context) {
        resolveCurrentlyRenderingComponent();
        return context._currentValue;
      },
      useMemo,
      useReducer,
      useRef: function(initialValue) {
        currentlyRenderingComponent = resolveCurrentlyRenderingComponent();
        workInProgressHook = createWorkInProgressHook();
        var previousRef = workInProgressHook.memoizedState;
        return null === previousRef ? (initialValue = { current: initialValue }, workInProgressHook.memoizedState = initialValue) : previousRef;
      },
      useState: function(initialState) {
        return useReducer(basicStateReducer, initialState);
      },
      useInsertionEffect: noop,
      useLayoutEffect: noop,
      useCallback: function(callback, deps) {
        return useMemo(function() {
          return callback;
        }, deps);
      },
      useImperativeHandle: noop,
      useEffect: noop,
      useDebugValue: noop,
      useDeferredValue: function(value, initialValue) {
        resolveCurrentlyRenderingComponent();
        return void 0 !== initialValue ? initialValue : value;
      },
      useTransition: function() {
        resolveCurrentlyRenderingComponent();
        return [false, unsupportedStartTransition];
      },
      useId: function() {
        var JSCompiler_inline_result = currentlyRenderingTask.treeContext;
        var overflow = JSCompiler_inline_result.overflow;
        JSCompiler_inline_result = JSCompiler_inline_result.id;
        JSCompiler_inline_result = (JSCompiler_inline_result & ~(1 << 32 - clz32(JSCompiler_inline_result) - 1)).toString(32) + overflow;
        var resumableState = currentResumableState;
        if (null === resumableState)
          throw Error(
            "Invalid hook call. Hooks can only be called inside of the body of a function component."
          );
        overflow = localIdCounter++;
        JSCompiler_inline_result = "_" + resumableState.idPrefix + "R_" + JSCompiler_inline_result;
        0 < overflow && (JSCompiler_inline_result += "H" + overflow.toString(32));
        return JSCompiler_inline_result + "_";
      },
      useSyncExternalStore: function(subscribe, getSnapshot, getServerSnapshot) {
        if (void 0 === getServerSnapshot)
          throw Error(
            "Missing getServerSnapshot, which is required for server-rendered content. Will revert to client rendering."
          );
        return getServerSnapshot();
      },
      useOptimistic: function(passthrough) {
        resolveCurrentlyRenderingComponent();
        return [passthrough, unsupportedSetOptimisticState];
      },
      useActionState,
      useFormState: useActionState,
      useHostTransitionStatus: function() {
        resolveCurrentlyRenderingComponent();
        return sharedNotPendingObject;
      },
      useMemoCache: function(size) {
        for (var data = Array(size), i = 0; i < size; i++)
          data[i] = REACT_MEMO_CACHE_SENTINEL;
        return data;
      },
      useCacheRefresh: function() {
        return unsupportedRefresh;
      },
      useEffectEvent: function() {
        return throwOnUseEffectEventCall;
      }
    };
    var currentResumableState = null;
    var DefaultAsyncDispatcher = {
      getCacheForType: function() {
        throw Error("Not implemented.");
      },
      cacheSignal: function() {
        throw Error("Not implemented.");
      }
    };
    function prepareStackTrace(error, structuredStackTrace) {
      error = (error.name || "Error") + ": " + (error.message || "");
      for (var i = 0; i < structuredStackTrace.length; i++)
        error += "\n    at " + structuredStackTrace[i].toString();
      return error;
    }
    var prefix;
    var suffix;
    function describeBuiltInComponentFrame(name) {
      if (void 0 === prefix)
        try {
          throw Error();
        } catch (x) {
          var match = x.stack.trim().match(/\n( *(at )?)/);
          prefix = match && match[1] || "";
          suffix = -1 < x.stack.indexOf("\n    at") ? " (<anonymous>)" : -1 < x.stack.indexOf("@") ? "@unknown:0:0" : "";
        }
      return "\n" + prefix + name + suffix;
    }
    var reentry = false;
    function describeNativeComponentFrame(fn, construct) {
      if (!fn || reentry) return "";
      reentry = true;
      var previousPrepareStackTrace = Error.prepareStackTrace;
      Error.prepareStackTrace = prepareStackTrace;
      try {
        var RunInRootFrame = {
          DetermineComponentFrameRoot: function() {
            try {
              if (construct) {
                var Fake = function() {
                  throw Error();
                };
                Object.defineProperty(Fake.prototype, "props", {
                  set: function() {
                    throw Error();
                  }
                });
                if ("object" === typeof Reflect && Reflect.construct) {
                  try {
                    Reflect.construct(Fake, []);
                  } catch (x) {
                    var control = x;
                  }
                  Reflect.construct(fn, [], Fake);
                } else {
                  try {
                    Fake.call();
                  } catch (x$24) {
                    control = x$24;
                  }
                  fn.call(Fake.prototype);
                }
              } else {
                try {
                  throw Error();
                } catch (x$25) {
                  control = x$25;
                }
                (Fake = fn()) && "function" === typeof Fake.catch && Fake.catch(function() {
                });
              }
            } catch (sample) {
              if (sample && control && "string" === typeof sample.stack)
                return [sample.stack, control.stack];
            }
            return [null, null];
          }
        };
        RunInRootFrame.DetermineComponentFrameRoot.displayName = "DetermineComponentFrameRoot";
        var namePropDescriptor = Object.getOwnPropertyDescriptor(
          RunInRootFrame.DetermineComponentFrameRoot,
          "name"
        );
        namePropDescriptor && namePropDescriptor.configurable && Object.defineProperty(
          RunInRootFrame.DetermineComponentFrameRoot,
          "name",
          { value: "DetermineComponentFrameRoot" }
        );
        var _RunInRootFrame$Deter = RunInRootFrame.DetermineComponentFrameRoot(), sampleStack = _RunInRootFrame$Deter[0], controlStack = _RunInRootFrame$Deter[1];
        if (sampleStack && controlStack) {
          var sampleLines = sampleStack.split("\n"), controlLines = controlStack.split("\n");
          for (namePropDescriptor = RunInRootFrame = 0; RunInRootFrame < sampleLines.length && !sampleLines[RunInRootFrame].includes("DetermineComponentFrameRoot"); )
            RunInRootFrame++;
          for (; namePropDescriptor < controlLines.length && !controlLines[namePropDescriptor].includes(
            "DetermineComponentFrameRoot"
          ); )
            namePropDescriptor++;
          if (RunInRootFrame === sampleLines.length || namePropDescriptor === controlLines.length)
            for (RunInRootFrame = sampleLines.length - 1, namePropDescriptor = controlLines.length - 1; 1 <= RunInRootFrame && 0 <= namePropDescriptor && sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]; )
              namePropDescriptor--;
          for (; 1 <= RunInRootFrame && 0 <= namePropDescriptor; RunInRootFrame--, namePropDescriptor--)
            if (sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
              if (1 !== RunInRootFrame || 1 !== namePropDescriptor) {
                do
                  if (RunInRootFrame--, namePropDescriptor--, 0 > namePropDescriptor || sampleLines[RunInRootFrame] !== controlLines[namePropDescriptor]) {
                    var frame = "\n" + sampleLines[RunInRootFrame].replace(" at new ", " at ");
                    fn.displayName && frame.includes("<anonymous>") && (frame = frame.replace("<anonymous>", fn.displayName));
                    return frame;
                  }
                while (1 <= RunInRootFrame && 0 <= namePropDescriptor);
              }
              break;
            }
        }
      } finally {
        reentry = false, Error.prepareStackTrace = previousPrepareStackTrace;
      }
      return (previousPrepareStackTrace = fn ? fn.displayName || fn.name : "") ? describeBuiltInComponentFrame(previousPrepareStackTrace) : "";
    }
    function describeComponentStackByType(type) {
      if ("string" === typeof type) return describeBuiltInComponentFrame(type);
      if ("function" === typeof type)
        return type.prototype && type.prototype.isReactComponent ? describeNativeComponentFrame(type, true) : describeNativeComponentFrame(type, false);
      if ("object" === typeof type && null !== type) {
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            return describeNativeComponentFrame(type.render, false);
          case REACT_MEMO_TYPE:
            return describeNativeComponentFrame(type.type, false);
          case REACT_LAZY_TYPE:
            var lazyComponent = type, payload = lazyComponent._payload;
            lazyComponent = lazyComponent._init;
            try {
              type = lazyComponent(payload);
            } catch (x) {
              return describeBuiltInComponentFrame("Lazy");
            }
            return describeComponentStackByType(type);
        }
        if ("string" === typeof type.name) {
          a: {
            payload = type.name;
            lazyComponent = type.env;
            var location = type.debugLocation;
            if (null != location && (type = Error.prepareStackTrace, Error.prepareStackTrace = prepareStackTrace, location = location.stack, Error.prepareStackTrace = type, location.startsWith("Error: react-stack-top-frame\n") && (location = location.slice(29)), type = location.indexOf("\n"), -1 !== type && (location = location.slice(type + 1)), type = location.indexOf("react_stack_bottom_frame"), -1 !== type && (type = location.lastIndexOf("\n", type)), type = -1 !== type ? location = location.slice(0, type) : "", location = type.lastIndexOf("\n"), type = -1 === location ? type : type.slice(location + 1), -1 !== type.indexOf(payload))) {
              payload = "\n" + type;
              break a;
            }
            payload = describeBuiltInComponentFrame(
              payload + (lazyComponent ? " [" + lazyComponent + "]" : "")
            );
          }
          return payload;
        }
      }
      switch (type) {
        case REACT_SUSPENSE_LIST_TYPE:
          return describeBuiltInComponentFrame("SuspenseList");
        case REACT_SUSPENSE_TYPE:
          return describeBuiltInComponentFrame("Suspense");
      }
      return "";
    }
    function isEligibleForOutlining(request, boundary) {
      return (500 < boundary.byteSize || hasSuspenseyContent(boundary.contentState)) && null === boundary.contentPreamble;
    }
    function defaultErrorHandler(error) {
      if ("object" === typeof error && null !== error && "string" === typeof error.environmentName) {
        var JSCompiler_inline_result = error.environmentName;
        error = [error].slice(0);
        "string" === typeof error[0] ? error.splice(
          0,
          1,
          "\x1B[0m\x1B[7m%c%s\x1B[0m%c " + error[0],
          "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px",
          " " + JSCompiler_inline_result + " ",
          ""
        ) : error.splice(
          0,
          0,
          "\x1B[0m\x1B[7m%c%s\x1B[0m%c",
          "background: #e6e6e6;background: light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.25));color: #000000;color: light-dark(#000000, #ffffff);border-radius: 2px",
          " " + JSCompiler_inline_result + " ",
          ""
        );
        error.unshift(console);
        JSCompiler_inline_result = bind.apply(console.error, error);
        JSCompiler_inline_result();
      } else console.error(error);
      return null;
    }
    function RequestInstance(resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
      var abortSet = /* @__PURE__ */ new Set();
      this.destination = null;
      this.flushScheduled = false;
      this.resumableState = resumableState;
      this.renderState = renderState;
      this.rootFormatContext = rootFormatContext;
      this.progressiveChunkSize = void 0 === progressiveChunkSize ? 12800 : progressiveChunkSize;
      this.status = 10;
      this.fatalError = null;
      this.pendingRootTasks = this.allPendingTasks = this.nextSegmentId = 0;
      this.completedPreambleSegments = this.completedRootSegment = null;
      this.byteSize = 0;
      this.abortableTasks = abortSet;
      this.pingedTasks = [];
      this.clientRenderedBoundaries = [];
      this.completedBoundaries = [];
      this.partialBoundaries = [];
      this.trackedPostpones = null;
      this.onError = void 0 === onError ? defaultErrorHandler : onError;
      this.onPostpone = void 0 === onPostpone ? noop : onPostpone;
      this.onAllReady = void 0 === onAllReady ? noop : onAllReady;
      this.onShellReady = void 0 === onShellReady ? noop : onShellReady;
      this.onShellError = void 0 === onShellError ? noop : onShellError;
      this.onFatalError = void 0 === onFatalError ? noop : onFatalError;
      this.formState = void 0 === formState ? null : formState;
    }
    function createRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone, formState) {
      resumableState = new RequestInstance(
        resumableState,
        renderState,
        rootFormatContext,
        progressiveChunkSize,
        onError,
        onAllReady,
        onShellReady,
        onShellError,
        onFatalError,
        onPostpone,
        formState
      );
      renderState = createPendingSegment(
        resumableState,
        0,
        null,
        rootFormatContext,
        false,
        false
      );
      renderState.parentFlushed = true;
      children = createRenderTask(
        resumableState,
        null,
        children,
        -1,
        null,
        renderState,
        null,
        null,
        resumableState.abortableTasks,
        null,
        rootFormatContext,
        null,
        emptyTreeContext,
        null,
        null
      );
      pushComponentStack(children);
      resumableState.pingedTasks.push(children);
      return resumableState;
    }
    function createPrerenderRequest(children, resumableState, renderState, rootFormatContext, progressiveChunkSize, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone) {
      children = createRequest(
        children,
        resumableState,
        renderState,
        rootFormatContext,
        progressiveChunkSize,
        onError,
        onAllReady,
        onShellReady,
        onShellError,
        onFatalError,
        onPostpone,
        void 0
      );
      children.trackedPostpones = {
        workingMap: /* @__PURE__ */ new Map(),
        rootNodes: [],
        rootSlots: null
      };
      return children;
    }
    function resumeRequest(children, postponedState, renderState, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone) {
      renderState = new RequestInstance(
        postponedState.resumableState,
        renderState,
        postponedState.rootFormatContext,
        postponedState.progressiveChunkSize,
        onError,
        onAllReady,
        onShellReady,
        onShellError,
        onFatalError,
        onPostpone,
        null
      );
      renderState.nextSegmentId = postponedState.nextSegmentId;
      if ("number" === typeof postponedState.replaySlots)
        return onError = createPendingSegment(
          renderState,
          0,
          null,
          postponedState.rootFormatContext,
          false,
          false
        ), onError.parentFlushed = true, children = createRenderTask(
          renderState,
          null,
          children,
          -1,
          null,
          onError,
          null,
          null,
          renderState.abortableTasks,
          null,
          postponedState.rootFormatContext,
          null,
          emptyTreeContext,
          null,
          null
        ), pushComponentStack(children), renderState.pingedTasks.push(children), renderState;
      children = createReplayTask(
        renderState,
        null,
        {
          nodes: postponedState.replayNodes,
          slots: postponedState.replaySlots,
          pendingTasks: 0
        },
        children,
        -1,
        null,
        null,
        renderState.abortableTasks,
        null,
        postponedState.rootFormatContext,
        null,
        emptyTreeContext,
        null,
        null
      );
      pushComponentStack(children);
      renderState.pingedTasks.push(children);
      return renderState;
    }
    function resumeAndPrerenderRequest(children, postponedState, renderState, onError, onAllReady, onShellReady, onShellError, onFatalError, onPostpone) {
      children = resumeRequest(
        children,
        postponedState,
        renderState,
        onError,
        onAllReady,
        onShellReady,
        onShellError,
        onFatalError,
        onPostpone
      );
      children.trackedPostpones = {
        workingMap: /* @__PURE__ */ new Map(),
        rootNodes: [],
        rootSlots: null
      };
      return children;
    }
    var currentRequest = null;
    function resolveRequest() {
      if (currentRequest) return currentRequest;
      var store = requestStorage.getStore();
      return store ? store : null;
    }
    function pingTask(request, task) {
      request.pingedTasks.push(task);
      1 === request.pingedTasks.length && (request.flushScheduled = null !== request.destination, null !== request.trackedPostpones || 10 === request.status ? scheduleMicrotask(function() {
        return performWork(request);
      }) : setImmediate(function() {
        return performWork(request);
      }));
    }
    function createSuspenseBoundary(request, row, fallbackAbortableTasks, contentPreamble, fallbackPreamble) {
      fallbackAbortableTasks = {
        status: 0,
        rootSegmentID: -1,
        parentFlushed: false,
        pendingTasks: 0,
        row,
        completedSegments: [],
        byteSize: 0,
        fallbackAbortableTasks,
        errorDigest: null,
        contentState: createHoistableState(),
        fallbackState: createHoistableState(),
        contentPreamble,
        fallbackPreamble,
        trackedContentKeyPath: null,
        trackedFallbackNode: null
      };
      null !== row && (row.pendingTasks++, contentPreamble = row.boundaries, null !== contentPreamble && (request.allPendingTasks++, fallbackAbortableTasks.pendingTasks++, contentPreamble.push(fallbackAbortableTasks)), request = row.inheritedHoistables, null !== request && hoistHoistables(fallbackAbortableTasks.contentState, request));
      return fallbackAbortableTasks;
    }
    function createRenderTask(request, thenableState2, node, childIndex, blockedBoundary, blockedSegment, blockedPreamble, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
      request.allPendingTasks++;
      null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
      null !== row && row.pendingTasks++;
      var task = {
        replay: null,
        node,
        childIndex,
        ping: function() {
          return pingTask(request, task);
        },
        blockedBoundary,
        blockedSegment,
        blockedPreamble,
        hoistableState,
        abortSet,
        keyPath,
        formatContext,
        context,
        treeContext,
        row,
        componentStack,
        thenableState: thenableState2
      };
      abortSet.add(task);
      return task;
    }
    function createReplayTask(request, thenableState2, replay, node, childIndex, blockedBoundary, hoistableState, abortSet, keyPath, formatContext, context, treeContext, row, componentStack) {
      request.allPendingTasks++;
      null === blockedBoundary ? request.pendingRootTasks++ : blockedBoundary.pendingTasks++;
      null !== row && row.pendingTasks++;
      replay.pendingTasks++;
      var task = {
        replay,
        node,
        childIndex,
        ping: function() {
          return pingTask(request, task);
        },
        blockedBoundary,
        blockedSegment: null,
        blockedPreamble: null,
        hoistableState,
        abortSet,
        keyPath,
        formatContext,
        context,
        treeContext,
        row,
        componentStack,
        thenableState: thenableState2
      };
      abortSet.add(task);
      return task;
    }
    function createPendingSegment(request, index, boundary, parentFormatContext, lastPushedText, textEmbedded) {
      return {
        status: 0,
        parentFlushed: false,
        id: -1,
        index,
        chunks: [],
        children: [],
        preambleChildren: [],
        parentFormatContext,
        boundary,
        lastPushedText,
        textEmbedded
      };
    }
    function pushComponentStack(task) {
      var node = task.node;
      if ("object" === typeof node && null !== node)
        switch (node.$$typeof) {
          case REACT_ELEMENT_TYPE:
            task.componentStack = { parent: task.componentStack, type: node.type };
        }
    }
    function replaceSuspenseComponentStackWithSuspenseFallbackStack(componentStack) {
      return null === componentStack ? null : { parent: componentStack.parent, type: "Suspense Fallback" };
    }
    function getThrownInfo(node$jscomp$0) {
      var errorInfo = {};
      node$jscomp$0 && Object.defineProperty(errorInfo, "componentStack", {
        configurable: true,
        enumerable: true,
        get: function() {
          try {
            var info = "", node = node$jscomp$0;
            do
              info += describeComponentStackByType(node.type), node = node.parent;
            while (node);
            var JSCompiler_inline_result = info;
          } catch (x) {
            JSCompiler_inline_result = "\nError generating stack: " + x.message + "\n" + x.stack;
          }
          Object.defineProperty(errorInfo, "componentStack", {
            value: JSCompiler_inline_result
          });
          return JSCompiler_inline_result;
        }
      });
      return errorInfo;
    }
    function logRecoverableError(request, error, errorInfo) {
      request = request.onError;
      error = request(error, errorInfo);
      if (null == error || "string" === typeof error) return error;
    }
    function fatalError(request, error) {
      var onShellError = request.onShellError, onFatalError = request.onFatalError;
      onShellError(error);
      onFatalError(error);
      null !== request.destination ? (request.status = 14, request.destination.destroy(error)) : (request.status = 13, request.fatalError = error);
    }
    function finishSuspenseListRow(request, row) {
      unblockSuspenseListRow(request, row.next, row.hoistables);
    }
    function unblockSuspenseListRow(request, unblockedRow, inheritedHoistables) {
      for (; null !== unblockedRow; ) {
        null !== inheritedHoistables && (hoistHoistables(unblockedRow.hoistables, inheritedHoistables), unblockedRow.inheritedHoistables = inheritedHoistables);
        var unblockedBoundaries = unblockedRow.boundaries;
        if (null !== unblockedBoundaries) {
          unblockedRow.boundaries = null;
          for (var i = 0; i < unblockedBoundaries.length; i++) {
            var unblockedBoundary = unblockedBoundaries[i];
            null !== inheritedHoistables && hoistHoistables(unblockedBoundary.contentState, inheritedHoistables);
            finishedTask(request, unblockedBoundary, null, null);
          }
        }
        unblockedRow.pendingTasks--;
        if (0 < unblockedRow.pendingTasks) break;
        inheritedHoistables = unblockedRow.hoistables;
        unblockedRow = unblockedRow.next;
      }
    }
    function tryToResolveTogetherRow(request, togetherRow) {
      var boundaries = togetherRow.boundaries;
      if (null !== boundaries && togetherRow.pendingTasks === boundaries.length) {
        for (var allCompleteAndInlinable = true, i = 0; i < boundaries.length; i++) {
          var rowBoundary = boundaries[i];
          if (1 !== rowBoundary.pendingTasks || rowBoundary.parentFlushed || isEligibleForOutlining(request, rowBoundary)) {
            allCompleteAndInlinable = false;
            break;
          }
        }
        allCompleteAndInlinable && unblockSuspenseListRow(request, togetherRow, togetherRow.hoistables);
      }
    }
    function createSuspenseListRow(previousRow) {
      var newRow = {
        pendingTasks: 1,
        boundaries: null,
        hoistables: createHoistableState(),
        inheritedHoistables: null,
        together: false,
        next: null
      };
      null !== previousRow && 0 < previousRow.pendingTasks && (newRow.pendingTasks++, newRow.boundaries = [], previousRow.next = newRow);
      return newRow;
    }
    function renderSuspenseListRows(request, task, keyPath, rows, revealOrder) {
      var prevKeyPath = task.keyPath, prevTreeContext = task.treeContext, prevRow = task.row;
      task.keyPath = keyPath;
      keyPath = rows.length;
      var previousSuspenseListRow = null;
      if (null !== task.replay) {
        var resumeSlots = task.replay.slots;
        if (null !== resumeSlots && "object" === typeof resumeSlots)
          for (var n = 0; n < keyPath; n++) {
            var i = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? n : keyPath - 1 - n, node = rows[i];
            task.row = previousSuspenseListRow = createSuspenseListRow(
              previousSuspenseListRow
            );
            task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
            var resumeSegmentID = resumeSlots[i];
            "number" === typeof resumeSegmentID ? (resumeNode(request, task, resumeSegmentID, node, i), delete resumeSlots[i]) : renderNode(request, task, node, i);
            0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
          }
        else
          for (resumeSlots = 0; resumeSlots < keyPath; resumeSlots++)
            n = "backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder ? resumeSlots : keyPath - 1 - resumeSlots, i = rows[n], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(prevTreeContext, keyPath, n), renderNode(request, task, i, n), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
      } else if ("backwards" !== revealOrder && "unstable_legacy-backwards" !== revealOrder)
        for (revealOrder = 0; revealOrder < keyPath; revealOrder++)
          resumeSlots = rows[revealOrder], task.row = previousSuspenseListRow = createSuspenseListRow(previousSuspenseListRow), task.treeContext = pushTreeContext(
            prevTreeContext,
            keyPath,
            revealOrder
          ), renderNode(request, task, resumeSlots, revealOrder), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
      else {
        revealOrder = task.blockedSegment;
        resumeSlots = revealOrder.children.length;
        n = revealOrder.chunks.length;
        for (i = keyPath - 1; 0 <= i; i--) {
          node = rows[i];
          task.row = previousSuspenseListRow = createSuspenseListRow(
            previousSuspenseListRow
          );
          task.treeContext = pushTreeContext(prevTreeContext, keyPath, i);
          resumeSegmentID = createPendingSegment(
            request,
            n,
            null,
            task.formatContext,
            0 === i ? revealOrder.lastPushedText : true,
            true
          );
          revealOrder.children.splice(resumeSlots, 0, resumeSegmentID);
          task.blockedSegment = resumeSegmentID;
          try {
            renderNode(request, task, node, i), resumeSegmentID.lastPushedText && resumeSegmentID.textEmbedded && resumeSegmentID.chunks.push(textSeparator), resumeSegmentID.status = 1, finishedSegment(request, task.blockedBoundary, resumeSegmentID), 0 === --previousSuspenseListRow.pendingTasks && finishSuspenseListRow(request, previousSuspenseListRow);
          } catch (thrownValue) {
            throw resumeSegmentID.status = 12 === request.status ? 3 : 4, thrownValue;
          }
        }
        task.blockedSegment = revealOrder;
        revealOrder.lastPushedText = false;
      }
      null !== prevRow && null !== previousSuspenseListRow && 0 < previousSuspenseListRow.pendingTasks && (prevRow.pendingTasks++, previousSuspenseListRow.next = prevRow);
      task.treeContext = prevTreeContext;
      task.row = prevRow;
      task.keyPath = prevKeyPath;
    }
    function renderWithHooks(request, task, keyPath, Component, props, secondArg) {
      var prevThenableState = task.thenableState;
      task.thenableState = null;
      currentlyRenderingComponent = {};
      currentlyRenderingTask = task;
      currentlyRenderingRequest = request;
      currentlyRenderingKeyPath = keyPath;
      actionStateCounter = localIdCounter = 0;
      actionStateMatchingIndex = -1;
      thenableIndexCounter = 0;
      thenableState = prevThenableState;
      for (request = Component(props, secondArg); didScheduleRenderPhaseUpdate; )
        didScheduleRenderPhaseUpdate = false, actionStateCounter = localIdCounter = 0, actionStateMatchingIndex = -1, thenableIndexCounter = 0, numberOfReRenders += 1, workInProgressHook = null, request = Component(props, secondArg);
      resetHooksState();
      return request;
    }
    function finishFunctionComponent(request, task, keyPath, children, hasId, actionStateCount, actionStateMatchingIndex2) {
      var didEmitActionStateMarkers = false;
      if (0 !== actionStateCount && null !== request.formState) {
        var segment = task.blockedSegment;
        if (null !== segment) {
          didEmitActionStateMarkers = true;
          segment = segment.chunks;
          for (var i = 0; i < actionStateCount; i++)
            i === actionStateMatchingIndex2 ? segment.push(formStateMarkerIsMatching) : segment.push(formStateMarkerIsNotMatching);
        }
      }
      actionStateCount = task.keyPath;
      task.keyPath = keyPath;
      hasId ? (keyPath = task.treeContext, task.treeContext = pushTreeContext(keyPath, 1, 0), renderNode(request, task, children, -1), task.treeContext = keyPath) : didEmitActionStateMarkers ? renderNode(request, task, children, -1) : renderNodeDestructive(request, task, children, -1);
      task.keyPath = actionStateCount;
    }
    function renderElement(request, task, keyPath, type, props, ref) {
      if ("function" === typeof type)
        if (type.prototype && type.prototype.isReactComponent) {
          var newProps = props;
          if ("ref" in props) {
            newProps = {};
            for (var propName in props)
              "ref" !== propName && (newProps[propName] = props[propName]);
          }
          var defaultProps = type.defaultProps;
          if (defaultProps) {
            newProps === props && (newProps = assign({}, newProps, props));
            for (var propName$44 in defaultProps)
              void 0 === newProps[propName$44] && (newProps[propName$44] = defaultProps[propName$44]);
          }
          props = newProps;
          newProps = emptyContextObject;
          defaultProps = type.contextType;
          "object" === typeof defaultProps && null !== defaultProps && (newProps = defaultProps._currentValue);
          newProps = new type(props, newProps);
          var initialState = void 0 !== newProps.state ? newProps.state : null;
          newProps.updater = classComponentUpdater;
          newProps.props = props;
          newProps.state = initialState;
          defaultProps = { queue: [], replace: false };
          newProps._reactInternals = defaultProps;
          ref = type.contextType;
          newProps.context = "object" === typeof ref && null !== ref ? ref._currentValue : emptyContextObject;
          ref = type.getDerivedStateFromProps;
          "function" === typeof ref && (ref = ref(props, initialState), initialState = null === ref || void 0 === ref ? initialState : assign({}, initialState, ref), newProps.state = initialState);
          if ("function" !== typeof type.getDerivedStateFromProps && "function" !== typeof newProps.getSnapshotBeforeUpdate && ("function" === typeof newProps.UNSAFE_componentWillMount || "function" === typeof newProps.componentWillMount))
            if (type = newProps.state, "function" === typeof newProps.componentWillMount && newProps.componentWillMount(), "function" === typeof newProps.UNSAFE_componentWillMount && newProps.UNSAFE_componentWillMount(), type !== newProps.state && classComponentUpdater.enqueueReplaceState(
              newProps,
              newProps.state,
              null
            ), null !== defaultProps.queue && 0 < defaultProps.queue.length)
              if (type = defaultProps.queue, ref = defaultProps.replace, defaultProps.queue = null, defaultProps.replace = false, ref && 1 === type.length)
                newProps.state = type[0];
              else {
                defaultProps = ref ? type[0] : newProps.state;
                initialState = true;
                for (ref = ref ? 1 : 0; ref < type.length; ref++)
                  propName$44 = type[ref], propName$44 = "function" === typeof propName$44 ? propName$44.call(newProps, defaultProps, props, void 0) : propName$44, null != propName$44 && (initialState ? (initialState = false, defaultProps = assign({}, defaultProps, propName$44)) : assign(defaultProps, propName$44));
                newProps.state = defaultProps;
              }
            else defaultProps.queue = null;
          type = newProps.render();
          if (12 === request.status) throw null;
          props = task.keyPath;
          task.keyPath = keyPath;
          renderNodeDestructive(request, task, type, -1);
          task.keyPath = props;
        } else {
          type = renderWithHooks(request, task, keyPath, type, props, void 0);
          if (12 === request.status) throw null;
          finishFunctionComponent(
            request,
            task,
            keyPath,
            type,
            0 !== localIdCounter,
            actionStateCounter,
            actionStateMatchingIndex
          );
        }
      else if ("string" === typeof type)
        if (newProps = task.blockedSegment, null === newProps)
          newProps = props.children, defaultProps = task.formatContext, initialState = task.keyPath, task.formatContext = getChildFormatContext(defaultProps, type, props), task.keyPath = keyPath, renderNode(request, task, newProps, -1), task.formatContext = defaultProps, task.keyPath = initialState;
        else {
          initialState = pushStartInstance(
            newProps.chunks,
            type,
            props,
            request.resumableState,
            request.renderState,
            task.blockedPreamble,
            task.hoistableState,
            task.formatContext,
            newProps.lastPushedText
          );
          newProps.lastPushedText = false;
          defaultProps = task.formatContext;
          ref = task.keyPath;
          task.keyPath = keyPath;
          if (3 === (task.formatContext = getChildFormatContext(defaultProps, type, props)).insertionMode) {
            keyPath = createPendingSegment(
              request,
              0,
              null,
              task.formatContext,
              false,
              false
            );
            newProps.preambleChildren.push(keyPath);
            task.blockedSegment = keyPath;
            try {
              keyPath.status = 6, renderNode(request, task, initialState, -1), keyPath.lastPushedText && keyPath.textEmbedded && keyPath.chunks.push(textSeparator), keyPath.status = 1, finishedSegment(request, task.blockedBoundary, keyPath);
            } finally {
              task.blockedSegment = newProps;
            }
          } else renderNode(request, task, initialState, -1);
          task.formatContext = defaultProps;
          task.keyPath = ref;
          a: {
            task = newProps.chunks;
            request = request.resumableState;
            switch (type) {
              case "title":
              case "style":
              case "script":
              case "area":
              case "base":
              case "br":
              case "col":
              case "embed":
              case "hr":
              case "img":
              case "input":
              case "keygen":
              case "link":
              case "meta":
              case "param":
              case "source":
              case "track":
              case "wbr":
                break a;
              case "body":
                if (1 >= defaultProps.insertionMode) {
                  request.hasBody = true;
                  break a;
                }
                break;
              case "html":
                if (0 === defaultProps.insertionMode) {
                  request.hasHtml = true;
                  break a;
                }
                break;
              case "head":
                if (1 >= defaultProps.insertionMode) break a;
            }
            task.push(endChunkForTag(type));
          }
          newProps.lastPushedText = false;
        }
      else {
        switch (type) {
          case REACT_LEGACY_HIDDEN_TYPE:
          case REACT_STRICT_MODE_TYPE:
          case REACT_PROFILER_TYPE:
          case REACT_FRAGMENT_TYPE:
            type = task.keyPath;
            task.keyPath = keyPath;
            renderNodeDestructive(request, task, props.children, -1);
            task.keyPath = type;
            return;
          case REACT_ACTIVITY_TYPE:
            type = task.blockedSegment;
            null === type ? "hidden" !== props.mode && (type = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = type) : "hidden" !== props.mode && (type.chunks.push(startActivityBoundary), type.lastPushedText = false, newProps = task.keyPath, task.keyPath = keyPath, renderNode(request, task, props.children, -1), task.keyPath = newProps, type.chunks.push(endActivityBoundary), type.lastPushedText = false);
            return;
          case REACT_SUSPENSE_LIST_TYPE:
            a: {
              type = props.children;
              props = props.revealOrder;
              if ("forwards" === props || "backwards" === props || "unstable_legacy-backwards" === props) {
                if (isArrayImpl(type)) {
                  renderSuspenseListRows(request, task, keyPath, type, props);
                  break a;
                }
                if (newProps = getIteratorFn(type)) {
                  if (newProps = newProps.call(type)) {
                    defaultProps = newProps.next();
                    if (!defaultProps.done) {
                      do
                        defaultProps = newProps.next();
                      while (!defaultProps.done);
                      renderSuspenseListRows(request, task, keyPath, type, props);
                    }
                    break a;
                  }
                }
              }
              "together" === props ? (props = task.keyPath, newProps = task.row, defaultProps = task.row = createSuspenseListRow(null), defaultProps.boundaries = [], defaultProps.together = true, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), 0 === --defaultProps.pendingTasks && finishSuspenseListRow(request, defaultProps), task.keyPath = props, task.row = newProps, null !== newProps && 0 < defaultProps.pendingTasks && (newProps.pendingTasks++, defaultProps.next = newProps)) : (props = task.keyPath, task.keyPath = keyPath, renderNodeDestructive(request, task, type, -1), task.keyPath = props);
            }
            return;
          case REACT_VIEW_TRANSITION_TYPE:
          case REACT_SCOPE_TYPE:
            throw Error("ReactDOMServer does not yet support scope components.");
          case REACT_SUSPENSE_TYPE:
            a: if (null !== task.replay) {
              type = task.keyPath;
              newProps = task.formatContext;
              defaultProps = task.row;
              task.keyPath = keyPath;
              task.formatContext = getSuspenseContentFormatContext(
                request.resumableState,
                newProps
              );
              task.row = null;
              keyPath = props.children;
              try {
                renderNode(request, task, keyPath, -1);
              } finally {
                task.keyPath = type, task.formatContext = newProps, task.row = defaultProps;
              }
            } else {
              type = task.keyPath;
              ref = task.formatContext;
              var prevRow = task.row;
              propName$44 = task.blockedBoundary;
              propName = task.blockedPreamble;
              var parentHoistableState = task.hoistableState, parentSegment = task.blockedSegment, fallback = props.fallback;
              props = props.children;
              var fallbackAbortSet = /* @__PURE__ */ new Set();
              var newBoundary = 2 > task.formatContext.insertionMode ? createSuspenseBoundary(
                request,
                task.row,
                fallbackAbortSet,
                createPreambleState(),
                createPreambleState()
              ) : createSuspenseBoundary(
                request,
                task.row,
                fallbackAbortSet,
                null,
                null
              );
              null !== request.trackedPostpones && (newBoundary.trackedContentKeyPath = keyPath);
              var boundarySegment = createPendingSegment(
                request,
                parentSegment.chunks.length,
                newBoundary,
                task.formatContext,
                false,
                false
              );
              parentSegment.children.push(boundarySegment);
              parentSegment.lastPushedText = false;
              var contentRootSegment = createPendingSegment(
                request,
                0,
                null,
                task.formatContext,
                false,
                false
              );
              contentRootSegment.parentFlushed = true;
              if (null !== request.trackedPostpones) {
                newProps = task.componentStack;
                defaultProps = [keyPath[0], "Suspense Fallback", keyPath[2]];
                initialState = [defaultProps[1], defaultProps[2], [], null];
                request.trackedPostpones.workingMap.set(defaultProps, initialState);
                newBoundary.trackedFallbackNode = initialState;
                task.blockedSegment = boundarySegment;
                task.blockedPreamble = newBoundary.fallbackPreamble;
                task.keyPath = defaultProps;
                task.formatContext = getSuspenseFallbackFormatContext(
                  request.resumableState,
                  ref
                );
                task.componentStack = replaceSuspenseComponentStackWithSuspenseFallbackStack(newProps);
                boundarySegment.status = 6;
                try {
                  renderNode(request, task, fallback, -1), boundarySegment.lastPushedText && boundarySegment.textEmbedded && boundarySegment.chunks.push(textSeparator), boundarySegment.status = 1, finishedSegment(request, propName$44, boundarySegment);
                } catch (thrownValue) {
                  throw boundarySegment.status = 12 === request.status ? 3 : 4, thrownValue;
                } finally {
                  task.blockedSegment = parentSegment, task.blockedPreamble = propName, task.keyPath = type, task.formatContext = ref;
                }
                task = createRenderTask(
                  request,
                  null,
                  props,
                  -1,
                  newBoundary,
                  contentRootSegment,
                  newBoundary.contentPreamble,
                  newBoundary.contentState,
                  task.abortSet,
                  keyPath,
                  getSuspenseContentFormatContext(
                    request.resumableState,
                    task.formatContext
                  ),
                  task.context,
                  task.treeContext,
                  null,
                  newProps
                );
                pushComponentStack(task);
                request.pingedTasks.push(task);
              } else {
                task.blockedBoundary = newBoundary;
                task.blockedPreamble = newBoundary.contentPreamble;
                task.hoistableState = newBoundary.contentState;
                task.blockedSegment = contentRootSegment;
                task.keyPath = keyPath;
                task.formatContext = getSuspenseContentFormatContext(
                  request.resumableState,
                  ref
                );
                task.row = null;
                contentRootSegment.status = 6;
                try {
                  if (renderNode(request, task, props, -1), contentRootSegment.lastPushedText && contentRootSegment.textEmbedded && contentRootSegment.chunks.push(textSeparator), contentRootSegment.status = 1, finishedSegment(request, newBoundary, contentRootSegment), queueCompletedSegment(newBoundary, contentRootSegment), 0 === newBoundary.pendingTasks && 0 === newBoundary.status) {
                    if (newBoundary.status = 1, !isEligibleForOutlining(request, newBoundary)) {
                      null !== prevRow && 0 === --prevRow.pendingTasks && finishSuspenseListRow(request, prevRow);
                      0 === request.pendingRootTasks && task.blockedPreamble && preparePreamble(request);
                      break a;
                    }
                  } else
                    null !== prevRow && prevRow.together && tryToResolveTogetherRow(request, prevRow);
                } catch (thrownValue$31) {
                  newBoundary.status = 4, 12 === request.status ? (contentRootSegment.status = 3, newProps = request.fatalError) : (contentRootSegment.status = 4, newProps = thrownValue$31), defaultProps = getThrownInfo(task.componentStack), initialState = logRecoverableError(
                    request,
                    newProps,
                    defaultProps
                  ), newBoundary.errorDigest = initialState, untrackBoundary(request, newBoundary);
                } finally {
                  task.blockedBoundary = propName$44, task.blockedPreamble = propName, task.hoistableState = parentHoistableState, task.blockedSegment = parentSegment, task.keyPath = type, task.formatContext = ref, task.row = prevRow;
                }
                task = createRenderTask(
                  request,
                  null,
                  fallback,
                  -1,
                  propName$44,
                  boundarySegment,
                  newBoundary.fallbackPreamble,
                  newBoundary.fallbackState,
                  fallbackAbortSet,
                  [keyPath[0], "Suspense Fallback", keyPath[2]],
                  getSuspenseFallbackFormatContext(
                    request.resumableState,
                    task.formatContext
                  ),
                  task.context,
                  task.treeContext,
                  task.row,
                  replaceSuspenseComponentStackWithSuspenseFallbackStack(
                    task.componentStack
                  )
                );
                pushComponentStack(task);
                request.pingedTasks.push(task);
              }
            }
            return;
        }
        if ("object" === typeof type && null !== type)
          switch (type.$$typeof) {
            case REACT_FORWARD_REF_TYPE:
              if ("ref" in props)
                for (parentSegment in newProps = {}, props)
                  "ref" !== parentSegment && (newProps[parentSegment] = props[parentSegment]);
              else newProps = props;
              type = renderWithHooks(
                request,
                task,
                keyPath,
                type.render,
                newProps,
                ref
              );
              finishFunctionComponent(
                request,
                task,
                keyPath,
                type,
                0 !== localIdCounter,
                actionStateCounter,
                actionStateMatchingIndex
              );
              return;
            case REACT_MEMO_TYPE:
              renderElement(request, task, keyPath, type.type, props, ref);
              return;
            case REACT_CONTEXT_TYPE:
              defaultProps = props.children;
              newProps = task.keyPath;
              props = props.value;
              initialState = type._currentValue;
              type._currentValue = props;
              ref = currentActiveSnapshot;
              currentActiveSnapshot = type = {
                parent: ref,
                depth: null === ref ? 0 : ref.depth + 1,
                context: type,
                parentValue: initialState,
                value: props
              };
              task.context = type;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, defaultProps, -1);
              request = currentActiveSnapshot;
              if (null === request)
                throw Error(
                  "Tried to pop a Context at the root of the app. This is a bug in React."
                );
              request.context._currentValue = request.parentValue;
              request = currentActiveSnapshot = request.parent;
              task.context = request;
              task.keyPath = newProps;
              return;
            case REACT_CONSUMER_TYPE:
              props = props.children;
              type = props(type._context._currentValue);
              props = task.keyPath;
              task.keyPath = keyPath;
              renderNodeDestructive(request, task, type, -1);
              task.keyPath = props;
              return;
            case REACT_LAZY_TYPE:
              newProps = type._init;
              type = newProps(type._payload);
              if (12 === request.status) throw null;
              renderElement(request, task, keyPath, type, props, ref);
              return;
          }
        throw Error(
          "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: " + ((null == type ? type : typeof type) + ".")
        );
      }
    }
    function resumeNode(request, task, segmentId, node, childIndex) {
      var prevReplay = task.replay, blockedBoundary = task.blockedBoundary, resumedSegment = createPendingSegment(
        request,
        0,
        null,
        task.formatContext,
        false,
        false
      );
      resumedSegment.id = segmentId;
      resumedSegment.parentFlushed = true;
      try {
        task.replay = null, task.blockedSegment = resumedSegment, renderNode(request, task, node, childIndex), resumedSegment.status = 1, finishedSegment(request, blockedBoundary, resumedSegment), null === blockedBoundary ? request.completedRootSegment = resumedSegment : (queueCompletedSegment(blockedBoundary, resumedSegment), blockedBoundary.parentFlushed && request.partialBoundaries.push(blockedBoundary));
      } finally {
        task.replay = prevReplay, task.blockedSegment = null;
      }
    }
    function renderNodeDestructive(request, task, node, childIndex) {
      null !== task.replay && "number" === typeof task.replay.slots ? resumeNode(request, task, task.replay.slots, node, childIndex) : (task.node = node, task.childIndex = childIndex, node = task.componentStack, pushComponentStack(task), retryNode(request, task), task.componentStack = node);
    }
    function retryNode(request, task) {
      var node = task.node, childIndex = task.childIndex;
      if (null !== node) {
        if ("object" === typeof node) {
          switch (node.$$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = node.type, key = node.key, props = node.props;
              node = props.ref;
              var ref = void 0 !== node ? node : null, name = getComponentNameFromType(type), keyOrIndex = null == key ? -1 === childIndex ? 0 : childIndex : key;
              key = [task.keyPath, name, keyOrIndex];
              if (null !== task.replay)
                a: {
                  var replay = task.replay;
                  childIndex = replay.nodes;
                  for (node = 0; node < childIndex.length; node++) {
                    var node$jscomp$0 = childIndex[node];
                    if (keyOrIndex === node$jscomp$0[1]) {
                      if (4 === node$jscomp$0.length) {
                        if (null !== name && name !== node$jscomp$0[0])
                          throw Error(
                            "Expected the resume to render <" + node$jscomp$0[0] + "> in this slot but instead it rendered <" + name + ">. The tree doesn't match so React will fallback to client rendering."
                          );
                        var childNodes = node$jscomp$0[2];
                        name = node$jscomp$0[3];
                        keyOrIndex = task.node;
                        task.replay = {
                          nodes: childNodes,
                          slots: name,
                          pendingTasks: 1
                        };
                        try {
                          renderElement(request, task, key, type, props, ref);
                          if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                            throw Error(
                              "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                            );
                          task.replay.pendingTasks--;
                        } catch (x) {
                          if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then))
                            throw task.node === keyOrIndex ? task.replay = replay : childIndex.splice(node, 1), x;
                          task.replay.pendingTasks--;
                          props = getThrownInfo(task.componentStack);
                          key = request;
                          request = task.blockedBoundary;
                          type = x;
                          props = logRecoverableError(key, type, props);
                          abortRemainingReplayNodes(
                            key,
                            request,
                            childNodes,
                            name,
                            type,
                            props
                          );
                        }
                        task.replay = replay;
                      } else {
                        if (type !== REACT_SUSPENSE_TYPE)
                          throw Error(
                            "Expected the resume to render <Suspense> in this slot but instead it rendered <" + (getComponentNameFromType(type) || "Unknown") + ">. The tree doesn't match so React will fallback to client rendering."
                          );
                        b: {
                          replay = void 0;
                          type = node$jscomp$0[5];
                          ref = node$jscomp$0[2];
                          name = node$jscomp$0[3];
                          keyOrIndex = null === node$jscomp$0[4] ? [] : node$jscomp$0[4][2];
                          node$jscomp$0 = null === node$jscomp$0[4] ? null : node$jscomp$0[4][3];
                          var prevKeyPath = task.keyPath, prevContext = task.formatContext, prevRow = task.row, previousReplaySet = task.replay, parentBoundary = task.blockedBoundary, parentHoistableState = task.hoistableState, content = props.children, fallback = props.fallback, fallbackAbortSet = /* @__PURE__ */ new Set();
                          props = 2 > task.formatContext.insertionMode ? createSuspenseBoundary(
                            request,
                            task.row,
                            fallbackAbortSet,
                            createPreambleState(),
                            createPreambleState()
                          ) : createSuspenseBoundary(
                            request,
                            task.row,
                            fallbackAbortSet,
                            null,
                            null
                          );
                          props.parentFlushed = true;
                          props.rootSegmentID = type;
                          task.blockedBoundary = props;
                          task.hoistableState = props.contentState;
                          task.keyPath = key;
                          task.formatContext = getSuspenseContentFormatContext(
                            request.resumableState,
                            prevContext
                          );
                          task.row = null;
                          task.replay = {
                            nodes: ref,
                            slots: name,
                            pendingTasks: 1
                          };
                          try {
                            renderNode(request, task, content, -1);
                            if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                              throw Error(
                                "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                              );
                            task.replay.pendingTasks--;
                            if (0 === props.pendingTasks && 0 === props.status) {
                              props.status = 1;
                              request.completedBoundaries.push(props);
                              break b;
                            }
                          } catch (error) {
                            props.status = 4, childNodes = getThrownInfo(task.componentStack), replay = logRecoverableError(
                              request,
                              error,
                              childNodes
                            ), props.errorDigest = replay, task.replay.pendingTasks--, request.clientRenderedBoundaries.push(props);
                          } finally {
                            task.blockedBoundary = parentBoundary, task.hoistableState = parentHoistableState, task.replay = previousReplaySet, task.keyPath = prevKeyPath, task.formatContext = prevContext, task.row = prevRow;
                          }
                          childNodes = createReplayTask(
                            request,
                            null,
                            {
                              nodes: keyOrIndex,
                              slots: node$jscomp$0,
                              pendingTasks: 0
                            },
                            fallback,
                            -1,
                            parentBoundary,
                            props.fallbackState,
                            fallbackAbortSet,
                            [key[0], "Suspense Fallback", key[2]],
                            getSuspenseFallbackFormatContext(
                              request.resumableState,
                              task.formatContext
                            ),
                            task.context,
                            task.treeContext,
                            task.row,
                            replaceSuspenseComponentStackWithSuspenseFallbackStack(
                              task.componentStack
                            )
                          );
                          pushComponentStack(childNodes);
                          request.pingedTasks.push(childNodes);
                        }
                      }
                      childIndex.splice(node, 1);
                      break a;
                    }
                  }
                }
              else renderElement(request, task, key, type, props, ref);
              return;
            case REACT_PORTAL_TYPE:
              throw Error(
                "Portals are not currently supported by the server renderer. Render them conditionally so that they only appear on the client render."
              );
            case REACT_LAZY_TYPE:
              childNodes = node._init;
              node = childNodes(node._payload);
              if (12 === request.status) throw null;
              renderNodeDestructive(request, task, node, childIndex);
              return;
          }
          if (isArrayImpl(node)) {
            renderChildrenArray(request, task, node, childIndex);
            return;
          }
          if (childNodes = getIteratorFn(node)) {
            if (childNodes = childNodes.call(node)) {
              node = childNodes.next();
              if (!node.done) {
                props = [];
                do
                  props.push(node.value), node = childNodes.next();
                while (!node.done);
                renderChildrenArray(request, task, props, childIndex);
              }
              return;
            }
          }
          if ("function" === typeof node.then)
            return task.thenableState = null, renderNodeDestructive(request, task, unwrapThenable(node), childIndex);
          if (node.$$typeof === REACT_CONTEXT_TYPE)
            return renderNodeDestructive(
              request,
              task,
              node._currentValue,
              childIndex
            );
          childIndex = Object.prototype.toString.call(node);
          throw Error(
            "Objects are not valid as a React child (found: " + ("[object Object]" === childIndex ? "object with keys {" + Object.keys(node).join(", ") + "}" : childIndex) + "). If you meant to render a collection of children, use an array instead."
          );
        }
        if ("string" === typeof node)
          childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            node,
            request.renderState,
            childIndex.lastPushedText
          ));
        else if ("number" === typeof node || "bigint" === typeof node)
          childIndex = task.blockedSegment, null !== childIndex && (childIndex.lastPushedText = pushTextInstance(
            childIndex.chunks,
            "" + node,
            request.renderState,
            childIndex.lastPushedText
          ));
      }
    }
    function renderChildrenArray(request, task, children, childIndex) {
      var prevKeyPath = task.keyPath;
      if (-1 !== childIndex && (task.keyPath = [task.keyPath, "Fragment", childIndex], null !== task.replay)) {
        for (var replay = task.replay, replayNodes = replay.nodes, j = 0; j < replayNodes.length; j++) {
          var node = replayNodes[j];
          if (node[1] === childIndex) {
            childIndex = node[2];
            node = node[3];
            task.replay = { nodes: childIndex, slots: node, pendingTasks: 1 };
            try {
              renderChildrenArray(request, task, children, -1);
              if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                throw Error(
                  "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                );
              task.replay.pendingTasks--;
            } catch (x) {
              if ("object" === typeof x && null !== x && (x === SuspenseException || "function" === typeof x.then))
                throw x;
              task.replay.pendingTasks--;
              children = getThrownInfo(task.componentStack);
              var boundary = task.blockedBoundary, error = x;
              children = logRecoverableError(request, error, children);
              abortRemainingReplayNodes(
                request,
                boundary,
                childIndex,
                node,
                error,
                children
              );
            }
            task.replay = replay;
            replayNodes.splice(j, 1);
            break;
          }
        }
        task.keyPath = prevKeyPath;
        return;
      }
      replay = task.treeContext;
      replayNodes = children.length;
      if (null !== task.replay && (j = task.replay.slots, null !== j && "object" === typeof j)) {
        for (childIndex = 0; childIndex < replayNodes; childIndex++)
          node = children[childIndex], task.treeContext = pushTreeContext(replay, replayNodes, childIndex), boundary = j[childIndex], "number" === typeof boundary ? (resumeNode(request, task, boundary, node, childIndex), delete j[childIndex]) : renderNode(request, task, node, childIndex);
        task.treeContext = replay;
        task.keyPath = prevKeyPath;
        return;
      }
      for (j = 0; j < replayNodes; j++)
        childIndex = children[j], task.treeContext = pushTreeContext(replay, replayNodes, j), renderNode(request, task, childIndex, j);
      task.treeContext = replay;
      task.keyPath = prevKeyPath;
    }
    function trackPostponedBoundary(request, trackedPostpones, boundary) {
      boundary.status = 5;
      boundary.rootSegmentID = request.nextSegmentId++;
      request = boundary.trackedContentKeyPath;
      if (null === request)
        throw Error(
          "It should not be possible to postpone at the root. This is a bug in React."
        );
      var fallbackReplayNode = boundary.trackedFallbackNode, children = [], boundaryNode = trackedPostpones.workingMap.get(request);
      if (void 0 === boundaryNode)
        return boundary = [
          request[1],
          request[2],
          children,
          null,
          fallbackReplayNode,
          boundary.rootSegmentID
        ], trackedPostpones.workingMap.set(request, boundary), addToReplayParent(boundary, request[0], trackedPostpones), boundary;
      boundaryNode[4] = fallbackReplayNode;
      boundaryNode[5] = boundary.rootSegmentID;
      return boundaryNode;
    }
    function trackPostpone(request, trackedPostpones, task, segment) {
      segment.status = 5;
      var keyPath = task.keyPath, boundary = task.blockedBoundary;
      if (null === boundary)
        segment.id = request.nextSegmentId++, trackedPostpones.rootSlots = segment.id, null !== request.completedRootSegment && (request.completedRootSegment.status = 5);
      else {
        if (null !== boundary && 0 === boundary.status) {
          var boundaryNode = trackPostponedBoundary(
            request,
            trackedPostpones,
            boundary
          );
          if (boundary.trackedContentKeyPath === keyPath && -1 === task.childIndex) {
            -1 === segment.id && (segment.id = segment.parentFlushed ? boundary.rootSegmentID : request.nextSegmentId++);
            boundaryNode[3] = segment.id;
            return;
          }
        }
        -1 === segment.id && (segment.id = segment.parentFlushed && null !== boundary ? boundary.rootSegmentID : request.nextSegmentId++);
        if (-1 === task.childIndex)
          null === keyPath ? trackedPostpones.rootSlots = segment.id : (task = trackedPostpones.workingMap.get(keyPath), void 0 === task ? (task = [keyPath[1], keyPath[2], [], segment.id], addToReplayParent(task, keyPath[0], trackedPostpones)) : task[3] = segment.id);
        else {
          if (null === keyPath)
            if (request = trackedPostpones.rootSlots, null === request)
              request = trackedPostpones.rootSlots = {};
            else {
              if ("number" === typeof request)
                throw Error(
                  "It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React."
                );
            }
          else if (boundary = trackedPostpones.workingMap, boundaryNode = boundary.get(keyPath), void 0 === boundaryNode)
            request = {}, boundaryNode = [keyPath[1], keyPath[2], [], request], boundary.set(keyPath, boundaryNode), addToReplayParent(boundaryNode, keyPath[0], trackedPostpones);
          else if (request = boundaryNode[3], null === request)
            request = boundaryNode[3] = {};
          else if ("number" === typeof request)
            throw Error(
              "It should not be possible to postpone both at the root of an element as well as a slot below. This is a bug in React."
            );
          request[task.childIndex] = segment.id;
        }
      }
    }
    function untrackBoundary(request, boundary) {
      request = request.trackedPostpones;
      null !== request && (boundary = boundary.trackedContentKeyPath, null !== boundary && (boundary = request.workingMap.get(boundary), void 0 !== boundary && (boundary.length = 4, boundary[2] = [], boundary[3] = null)));
    }
    function spawnNewSuspendedReplayTask(request, task, thenableState2) {
      return createReplayTask(
        request,
        thenableState2,
        task.replay,
        task.node,
        task.childIndex,
        task.blockedBoundary,
        task.hoistableState,
        task.abortSet,
        task.keyPath,
        task.formatContext,
        task.context,
        task.treeContext,
        task.row,
        task.componentStack
      );
    }
    function spawnNewSuspendedRenderTask(request, task, thenableState2) {
      var segment = task.blockedSegment, newSegment = createPendingSegment(
        request,
        segment.chunks.length,
        null,
        task.formatContext,
        segment.lastPushedText,
        true
      );
      segment.children.push(newSegment);
      segment.lastPushedText = false;
      return createRenderTask(
        request,
        thenableState2,
        task.node,
        task.childIndex,
        task.blockedBoundary,
        newSegment,
        task.blockedPreamble,
        task.hoistableState,
        task.abortSet,
        task.keyPath,
        task.formatContext,
        task.context,
        task.treeContext,
        task.row,
        task.componentStack
      );
    }
    function renderNode(request, task, node, childIndex) {
      var previousFormatContext = task.formatContext, previousContext = task.context, previousKeyPath = task.keyPath, previousTreeContext = task.treeContext, previousComponentStack = task.componentStack, segment = task.blockedSegment;
      if (null === segment) {
        segment = task.replay;
        try {
          return renderNodeDestructive(request, task, node, childIndex);
        } catch (thrownValue) {
          if (resetHooksState(), node = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue, 12 !== request.status && "object" === typeof node && null !== node) {
            if ("function" === typeof node.then) {
              childIndex = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
              request = spawnNewSuspendedReplayTask(request, task, childIndex).ping;
              node.then(request, request);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              switchContext(previousContext);
              return;
            }
            if ("Maximum call stack size exceeded" === node.message) {
              node = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
              node = spawnNewSuspendedReplayTask(request, task, node);
              request.pingedTasks.push(node);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              task.replay = segment;
              switchContext(previousContext);
              return;
            }
          }
        }
      } else {
        var childrenLength = segment.children.length, chunkLength = segment.chunks.length;
        try {
          return renderNodeDestructive(request, task, node, childIndex);
        } catch (thrownValue$63) {
          if (resetHooksState(), segment.children.length = childrenLength, segment.chunks.length = chunkLength, node = thrownValue$63 === SuspenseException ? getSuspendedThenable() : thrownValue$63, 12 !== request.status && "object" === typeof node && null !== node) {
            if ("function" === typeof node.then) {
              segment = node;
              node = thrownValue$63 === SuspenseException ? getThenableStateAfterSuspending() : null;
              request = spawnNewSuspendedRenderTask(request, task, node).ping;
              segment.then(request, request);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              switchContext(previousContext);
              return;
            }
            if ("Maximum call stack size exceeded" === node.message) {
              segment = thrownValue$63 === SuspenseException ? getThenableStateAfterSuspending() : null;
              segment = spawnNewSuspendedRenderTask(request, task, segment);
              request.pingedTasks.push(segment);
              task.formatContext = previousFormatContext;
              task.context = previousContext;
              task.keyPath = previousKeyPath;
              task.treeContext = previousTreeContext;
              task.componentStack = previousComponentStack;
              switchContext(previousContext);
              return;
            }
          }
        }
      }
      task.formatContext = previousFormatContext;
      task.context = previousContext;
      task.keyPath = previousKeyPath;
      task.treeContext = previousTreeContext;
      switchContext(previousContext);
      throw node;
    }
    function abortTaskSoft(task) {
      var boundary = task.blockedBoundary, segment = task.blockedSegment;
      null !== segment && (segment.status = 3, finishedTask(this, boundary, task.row, segment));
    }
    function abortRemainingReplayNodes(request$jscomp$0, boundary, nodes, slots, error, errorDigest$jscomp$0) {
      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (4 === node.length)
          abortRemainingReplayNodes(
            request$jscomp$0,
            boundary,
            node[2],
            node[3],
            error,
            errorDigest$jscomp$0
          );
        else {
          node = node[5];
          var request = request$jscomp$0, errorDigest = errorDigest$jscomp$0, resumedBoundary = createSuspenseBoundary(
            request,
            null,
            /* @__PURE__ */ new Set(),
            null,
            null
          );
          resumedBoundary.parentFlushed = true;
          resumedBoundary.rootSegmentID = node;
          resumedBoundary.status = 4;
          resumedBoundary.errorDigest = errorDigest;
          resumedBoundary.parentFlushed && request.clientRenderedBoundaries.push(resumedBoundary);
        }
      }
      nodes.length = 0;
      if (null !== slots) {
        if (null === boundary)
          throw Error(
            "We should not have any resumable nodes in the shell. This is a bug in React."
          );
        4 !== boundary.status && (boundary.status = 4, boundary.errorDigest = errorDigest$jscomp$0, boundary.parentFlushed && request$jscomp$0.clientRenderedBoundaries.push(boundary));
        if ("object" === typeof slots) for (var index in slots) delete slots[index];
      }
    }
    function abortTask(task, request, error) {
      var boundary = task.blockedBoundary, segment = task.blockedSegment;
      if (null !== segment) {
        if (6 === segment.status) return;
        segment.status = 3;
      }
      var errorInfo = getThrownInfo(task.componentStack);
      if (null === boundary) {
        if (13 !== request.status && 14 !== request.status) {
          boundary = task.replay;
          if (null === boundary) {
            null !== request.trackedPostpones && null !== segment ? (boundary = request.trackedPostpones, logRecoverableError(request, error, errorInfo), trackPostpone(request, boundary, task, segment), finishedTask(request, null, task.row, segment)) : (logRecoverableError(request, error, errorInfo), fatalError(request, error));
            return;
          }
          boundary.pendingTasks--;
          0 === boundary.pendingTasks && 0 < boundary.nodes.length && (segment = logRecoverableError(request, error, errorInfo), abortRemainingReplayNodes(
            request,
            null,
            boundary.nodes,
            boundary.slots,
            error,
            segment
          ));
          request.pendingRootTasks--;
          0 === request.pendingRootTasks && completeShell(request);
        }
      } else {
        var trackedPostpones$64 = request.trackedPostpones;
        if (4 !== boundary.status) {
          if (null !== trackedPostpones$64 && null !== segment)
            return logRecoverableError(request, error, errorInfo), trackPostpone(request, trackedPostpones$64, task, segment), boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
              return abortTask(fallbackTask, request, error);
            }), boundary.fallbackAbortableTasks.clear(), finishedTask(request, boundary, task.row, segment);
          boundary.status = 4;
          segment = logRecoverableError(request, error, errorInfo);
          boundary.status = 4;
          boundary.errorDigest = segment;
          untrackBoundary(request, boundary);
          boundary.parentFlushed && request.clientRenderedBoundaries.push(boundary);
        }
        boundary.pendingTasks--;
        segment = boundary.row;
        null !== segment && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
        boundary.fallbackAbortableTasks.forEach(function(fallbackTask) {
          return abortTask(fallbackTask, request, error);
        });
        boundary.fallbackAbortableTasks.clear();
      }
      task = task.row;
      null !== task && 0 === --task.pendingTasks && finishSuspenseListRow(request, task);
      request.allPendingTasks--;
      0 === request.allPendingTasks && completeAll(request);
    }
    function safelyEmitEarlyPreloads(request, shellComplete) {
      try {
        var renderState = request.renderState, onHeaders = renderState.onHeaders;
        if (onHeaders) {
          var headers = renderState.headers;
          if (headers) {
            renderState.headers = null;
            var linkHeader = headers.preconnects;
            headers.fontPreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.fontPreloads);
            headers.highImagePreloads && (linkHeader && (linkHeader += ", "), linkHeader += headers.highImagePreloads);
            if (!shellComplete) {
              var queueIter = renderState.styles.values(), queueStep = queueIter.next();
              b: for (; 0 < headers.remainingCapacity && !queueStep.done; queueStep = queueIter.next())
                for (var sheetIter = queueStep.value.sheets.values(), sheetStep = sheetIter.next(); 0 < headers.remainingCapacity && !sheetStep.done; sheetStep = sheetIter.next()) {
                  var sheet = sheetStep.value, props = sheet.props, key = props.href, props$jscomp$0 = sheet.props, header = getPreloadAsHeader(props$jscomp$0.href, "style", {
                    crossOrigin: props$jscomp$0.crossOrigin,
                    integrity: props$jscomp$0.integrity,
                    nonce: props$jscomp$0.nonce,
                    type: props$jscomp$0.type,
                    fetchPriority: props$jscomp$0.fetchPriority,
                    referrerPolicy: props$jscomp$0.referrerPolicy,
                    media: props$jscomp$0.media
                  });
                  if (0 <= (headers.remainingCapacity -= header.length + 2))
                    renderState.resets.style[key] = PRELOAD_NO_CREDS, linkHeader && (linkHeader += ", "), linkHeader += header, renderState.resets.style[key] = "string" === typeof props.crossOrigin || "string" === typeof props.integrity ? [props.crossOrigin, props.integrity] : PRELOAD_NO_CREDS;
                  else break b;
                }
            }
            linkHeader ? onHeaders({ Link: linkHeader }) : onHeaders({});
          }
        }
      } catch (error) {
        logRecoverableError(request, error, {});
      }
    }
    function completeShell(request) {
      null === request.trackedPostpones && safelyEmitEarlyPreloads(request, true);
      null === request.trackedPostpones && preparePreamble(request);
      request.onShellError = noop;
      request = request.onShellReady;
      request();
    }
    function completeAll(request) {
      safelyEmitEarlyPreloads(
        request,
        null === request.trackedPostpones ? true : null === request.completedRootSegment || 5 !== request.completedRootSegment.status
      );
      preparePreamble(request);
      request = request.onAllReady;
      request();
    }
    function queueCompletedSegment(boundary, segment) {
      if (0 === segment.chunks.length && 1 === segment.children.length && null === segment.children[0].boundary && -1 === segment.children[0].id) {
        var childSegment = segment.children[0];
        childSegment.id = segment.id;
        childSegment.parentFlushed = true;
        1 !== childSegment.status && 3 !== childSegment.status && 4 !== childSegment.status || queueCompletedSegment(boundary, childSegment);
      } else boundary.completedSegments.push(segment);
    }
    function finishedSegment(request, boundary, segment) {
      if (null !== byteLengthOfChunk) {
        segment = segment.chunks;
        for (var segmentByteSize = 0, i = 0; i < segment.length; i++)
          segmentByteSize += byteLengthOfChunk(segment[i]);
        null === boundary ? request.byteSize += segmentByteSize : boundary.byteSize += segmentByteSize;
      }
    }
    function finishedTask(request, boundary, row, segment) {
      null !== row && (0 === --row.pendingTasks ? finishSuspenseListRow(request, row) : row.together && tryToResolveTogetherRow(request, row));
      request.allPendingTasks--;
      if (null === boundary) {
        if (null !== segment && segment.parentFlushed) {
          if (null !== request.completedRootSegment)
            throw Error(
              "There can only be one root segment. This is a bug in React."
            );
          request.completedRootSegment = segment;
        }
        request.pendingRootTasks--;
        0 === request.pendingRootTasks && completeShell(request);
      } else if (boundary.pendingTasks--, 4 !== boundary.status)
        if (0 === boundary.pendingTasks)
          if (0 === boundary.status && (boundary.status = 1), null !== segment && segment.parentFlushed && (1 === segment.status || 3 === segment.status) && queueCompletedSegment(boundary, segment), boundary.parentFlushed && request.completedBoundaries.push(boundary), 1 === boundary.status)
            row = boundary.row, null !== row && hoistHoistables(row.hoistables, boundary.contentState), isEligibleForOutlining(request, boundary) || (boundary.fallbackAbortableTasks.forEach(abortTaskSoft, request), boundary.fallbackAbortableTasks.clear(), null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row)), 0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary.contentPreamble && preparePreamble(request);
          else {
            if (5 === boundary.status && (boundary = boundary.row, null !== boundary)) {
              if (null !== request.trackedPostpones) {
                row = request.trackedPostpones;
                var postponedRow = boundary.next;
                if (null !== postponedRow && (segment = postponedRow.boundaries, null !== segment))
                  for (postponedRow.boundaries = null, postponedRow = 0; postponedRow < segment.length; postponedRow++) {
                    var postponedBoundary = segment[postponedRow];
                    trackPostponedBoundary(request, row, postponedBoundary);
                    finishedTask(request, postponedBoundary, null, null);
                  }
              }
              0 === --boundary.pendingTasks && finishSuspenseListRow(request, boundary);
            }
          }
        else
          null === segment || !segment.parentFlushed || 1 !== segment.status && 3 !== segment.status || (queueCompletedSegment(boundary, segment), 1 === boundary.completedSegments.length && boundary.parentFlushed && request.partialBoundaries.push(boundary)), boundary = boundary.row, null !== boundary && boundary.together && tryToResolveTogetherRow(request, boundary);
      0 === request.allPendingTasks && completeAll(request);
    }
    function performWork(request$jscomp$2) {
      if (14 !== request$jscomp$2.status && 13 !== request$jscomp$2.status) {
        var prevContext = currentActiveSnapshot, prevDispatcher = ReactSharedInternals.H;
        ReactSharedInternals.H = HooksDispatcher;
        var prevAsyncDispatcher = ReactSharedInternals.A;
        ReactSharedInternals.A = DefaultAsyncDispatcher;
        var prevRequest = currentRequest;
        currentRequest = request$jscomp$2;
        var prevResumableState = currentResumableState;
        currentResumableState = request$jscomp$2.resumableState;
        try {
          var pingedTasks = request$jscomp$2.pingedTasks, i;
          for (i = 0; i < pingedTasks.length; i++) {
            var task = pingedTasks[i], request = request$jscomp$2, segment = task.blockedSegment;
            if (null === segment) {
              var request$jscomp$0 = request;
              if (0 !== task.replay.pendingTasks) {
                switchContext(task.context);
                try {
                  "number" === typeof task.replay.slots ? resumeNode(
                    request$jscomp$0,
                    task,
                    task.replay.slots,
                    task.node,
                    task.childIndex
                  ) : retryNode(request$jscomp$0, task);
                  if (1 === task.replay.pendingTasks && 0 < task.replay.nodes.length)
                    throw Error(
                      "Couldn't find all resumable slots by key/index during replaying. The tree doesn't match so React will fallback to client rendering."
                    );
                  task.replay.pendingTasks--;
                  task.abortSet.delete(task);
                  finishedTask(
                    request$jscomp$0,
                    task.blockedBoundary,
                    task.row,
                    null
                  );
                } catch (thrownValue) {
                  resetHooksState();
                  var x = thrownValue === SuspenseException ? getSuspendedThenable() : thrownValue;
                  if ("object" === typeof x && null !== x && "function" === typeof x.then) {
                    var ping = task.ping;
                    x.then(ping, ping);
                    task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                  } else {
                    task.replay.pendingTasks--;
                    task.abortSet.delete(task);
                    var errorInfo = getThrownInfo(task.componentStack);
                    request = void 0;
                    var request$jscomp$1 = request$jscomp$0, boundary = task.blockedBoundary, error$jscomp$0 = 12 === request$jscomp$0.status ? request$jscomp$0.fatalError : x, replayNodes = task.replay.nodes, resumeSlots = task.replay.slots;
                    request = logRecoverableError(
                      request$jscomp$1,
                      error$jscomp$0,
                      errorInfo
                    );
                    abortRemainingReplayNodes(
                      request$jscomp$1,
                      boundary,
                      replayNodes,
                      resumeSlots,
                      error$jscomp$0,
                      request
                    );
                    request$jscomp$0.pendingRootTasks--;
                    0 === request$jscomp$0.pendingRootTasks && completeShell(request$jscomp$0);
                    request$jscomp$0.allPendingTasks--;
                    0 === request$jscomp$0.allPendingTasks && completeAll(request$jscomp$0);
                  }
                } finally {
                }
              }
            } else if (request$jscomp$0 = void 0, request$jscomp$1 = segment, 0 === request$jscomp$1.status) {
              request$jscomp$1.status = 6;
              switchContext(task.context);
              var childrenLength = request$jscomp$1.children.length, chunkLength = request$jscomp$1.chunks.length;
              try {
                retryNode(request, task), request$jscomp$1.lastPushedText && request$jscomp$1.textEmbedded && request$jscomp$1.chunks.push(textSeparator), task.abortSet.delete(task), request$jscomp$1.status = 1, finishedSegment(request, task.blockedBoundary, request$jscomp$1), finishedTask(
                  request,
                  task.blockedBoundary,
                  task.row,
                  request$jscomp$1
                );
              } catch (thrownValue) {
                resetHooksState();
                request$jscomp$1.children.length = childrenLength;
                request$jscomp$1.chunks.length = chunkLength;
                var x$jscomp$0 = thrownValue === SuspenseException ? getSuspendedThenable() : 12 === request.status ? request.fatalError : thrownValue;
                if (12 === request.status && null !== request.trackedPostpones) {
                  var trackedPostpones = request.trackedPostpones, thrownInfo = getThrownInfo(task.componentStack);
                  task.abortSet.delete(task);
                  logRecoverableError(request, x$jscomp$0, thrownInfo);
                  trackPostpone(request, trackedPostpones, task, request$jscomp$1);
                  finishedTask(
                    request,
                    task.blockedBoundary,
                    task.row,
                    request$jscomp$1
                  );
                } else if ("object" === typeof x$jscomp$0 && null !== x$jscomp$0 && "function" === typeof x$jscomp$0.then) {
                  request$jscomp$1.status = 0;
                  task.thenableState = thrownValue === SuspenseException ? getThenableStateAfterSuspending() : null;
                  var ping$jscomp$0 = task.ping;
                  x$jscomp$0.then(ping$jscomp$0, ping$jscomp$0);
                } else {
                  var errorInfo$jscomp$0 = getThrownInfo(task.componentStack);
                  task.abortSet.delete(task);
                  request$jscomp$1.status = 4;
                  var boundary$jscomp$0 = task.blockedBoundary, row = task.row;
                  null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
                  request.allPendingTasks--;
                  request$jscomp$0 = logRecoverableError(
                    request,
                    x$jscomp$0,
                    errorInfo$jscomp$0
                  );
                  if (null === boundary$jscomp$0) fatalError(request, x$jscomp$0);
                  else if (boundary$jscomp$0.pendingTasks--, 4 !== boundary$jscomp$0.status) {
                    boundary$jscomp$0.status = 4;
                    boundary$jscomp$0.errorDigest = request$jscomp$0;
                    untrackBoundary(request, boundary$jscomp$0);
                    var boundaryRow = boundary$jscomp$0.row;
                    null !== boundaryRow && 0 === --boundaryRow.pendingTasks && finishSuspenseListRow(request, boundaryRow);
                    boundary$jscomp$0.parentFlushed && request.clientRenderedBoundaries.push(boundary$jscomp$0);
                    0 === request.pendingRootTasks && null === request.trackedPostpones && null !== boundary$jscomp$0.contentPreamble && preparePreamble(request);
                  }
                  0 === request.allPendingTasks && completeAll(request);
                }
              } finally {
              }
            }
          }
          pingedTasks.splice(0, i);
          null !== request$jscomp$2.destination && flushCompletedQueues(request$jscomp$2, request$jscomp$2.destination);
        } catch (error) {
          logRecoverableError(request$jscomp$2, error, {}), fatalError(request$jscomp$2, error);
        } finally {
          currentResumableState = prevResumableState, ReactSharedInternals.H = prevDispatcher, ReactSharedInternals.A = prevAsyncDispatcher, prevDispatcher === HooksDispatcher && switchContext(prevContext), currentRequest = prevRequest;
        }
      }
    }
    function preparePreambleFromSubtree(request, segment, collectedPreambleSegments) {
      segment.preambleChildren.length && collectedPreambleSegments.push(segment.preambleChildren);
      for (var pendingPreambles = false, i = 0; i < segment.children.length; i++)
        pendingPreambles = preparePreambleFromSegment(
          request,
          segment.children[i],
          collectedPreambleSegments
        ) || pendingPreambles;
      return pendingPreambles;
    }
    function preparePreambleFromSegment(request, segment, collectedPreambleSegments) {
      var boundary = segment.boundary;
      if (null === boundary)
        return preparePreambleFromSubtree(
          request,
          segment,
          collectedPreambleSegments
        );
      var preamble = boundary.contentPreamble, fallbackPreamble = boundary.fallbackPreamble;
      if (null === preamble || null === fallbackPreamble) return false;
      switch (boundary.status) {
        case 1:
          hoistPreambleState(request.renderState, preamble);
          request.byteSize += boundary.byteSize;
          segment = boundary.completedSegments[0];
          if (!segment)
            throw Error(
              "A previously unvisited boundary must have exactly one root segment. This is a bug in React."
            );
          return preparePreambleFromSubtree(
            request,
            segment,
            collectedPreambleSegments
          );
        case 5:
          if (null !== request.trackedPostpones) return true;
        case 4:
          if (1 === segment.status)
            return hoistPreambleState(request.renderState, fallbackPreamble), preparePreambleFromSubtree(
              request,
              segment,
              collectedPreambleSegments
            );
        default:
          return true;
      }
    }
    function preparePreamble(request) {
      if (request.completedRootSegment && null === request.completedPreambleSegments) {
        var collectedPreambleSegments = [], originalRequestByteSize = request.byteSize, hasPendingPreambles = preparePreambleFromSegment(
          request,
          request.completedRootSegment,
          collectedPreambleSegments
        ), preamble = request.renderState.preamble;
        false === hasPendingPreambles || preamble.headChunks && preamble.bodyChunks ? request.completedPreambleSegments = collectedPreambleSegments : request.byteSize = originalRequestByteSize;
      }
    }
    function flushSubtree(request, destination, segment, hoistableState) {
      segment.parentFlushed = true;
      switch (segment.status) {
        case 0:
          segment.id = request.nextSegmentId++;
        case 5:
          return hoistableState = segment.id, segment.lastPushedText = false, segment.textEmbedded = false, request = request.renderState, writeChunk(destination, placeholder1), writeChunk(destination, request.placeholderPrefix), request = hoistableState.toString(16), writeChunk(destination, request), writeChunkAndReturn(destination, placeholder2);
        case 1:
          segment.status = 2;
          var r = true, chunks = segment.chunks, chunkIdx = 0;
          segment = segment.children;
          for (var childIdx = 0; childIdx < segment.length; childIdx++) {
            for (r = segment[childIdx]; chunkIdx < r.index; chunkIdx++)
              writeChunk(destination, chunks[chunkIdx]);
            r = flushSegment(request, destination, r, hoistableState);
          }
          for (; chunkIdx < chunks.length - 1; chunkIdx++)
            writeChunk(destination, chunks[chunkIdx]);
          chunkIdx < chunks.length && (r = writeChunkAndReturn(destination, chunks[chunkIdx]));
          return r;
        case 3:
          return true;
        default:
          throw Error(
            "Aborted, errored or already flushed boundaries should not be flushed again. This is a bug in React."
          );
      }
    }
    var flushedByteSize = 0;
    function flushSegment(request, destination, segment, hoistableState) {
      var boundary = segment.boundary;
      if (null === boundary)
        return flushSubtree(request, destination, segment, hoistableState);
      boundary.parentFlushed = true;
      if (4 === boundary.status) {
        var row = boundary.row;
        null !== row && 0 === --row.pendingTasks && finishSuspenseListRow(request, row);
        boundary = boundary.errorDigest;
        writeChunkAndReturn(destination, startClientRenderedSuspenseBoundary);
        writeChunk(destination, clientRenderedSuspenseBoundaryError1);
        boundary && (writeChunk(destination, clientRenderedSuspenseBoundaryError1A), writeChunk(destination, escapeTextForBrowser(boundary)), writeChunk(
          destination,
          clientRenderedSuspenseBoundaryErrorAttrInterstitial
        ));
        writeChunkAndReturn(destination, clientRenderedSuspenseBoundaryError2);
        flushSubtree(request, destination, segment, hoistableState);
      } else if (1 !== boundary.status)
        0 === boundary.status && (boundary.rootSegmentID = request.nextSegmentId++), 0 < boundary.completedSegments.length && request.partialBoundaries.push(boundary), writeStartPendingSuspenseBoundary(
          destination,
          request.renderState,
          boundary.rootSegmentID
        ), hoistableState && hoistHoistables(hoistableState, boundary.fallbackState), flushSubtree(request, destination, segment, hoistableState);
      else if (!flushingPartialBoundaries && isEligibleForOutlining(request, boundary) && (flushedByteSize + boundary.byteSize > request.progressiveChunkSize || hasSuspenseyContent(boundary.contentState)))
        boundary.rootSegmentID = request.nextSegmentId++, request.completedBoundaries.push(boundary), writeStartPendingSuspenseBoundary(
          destination,
          request.renderState,
          boundary.rootSegmentID
        ), flushSubtree(request, destination, segment, hoistableState);
      else {
        flushedByteSize += boundary.byteSize;
        hoistableState && hoistHoistables(hoistableState, boundary.contentState);
        segment = boundary.row;
        null !== segment && isEligibleForOutlining(request, boundary) && 0 === --segment.pendingTasks && finishSuspenseListRow(request, segment);
        writeChunkAndReturn(destination, startCompletedSuspenseBoundary);
        segment = boundary.completedSegments;
        if (1 !== segment.length)
          throw Error(
            "A previously unvisited boundary must have exactly one root segment. This is a bug in React."
          );
        flushSegment(request, destination, segment[0], hoistableState);
      }
      return writeChunkAndReturn(destination, endSuspenseBoundary);
    }
    function flushSegmentContainer(request, destination, segment, hoistableState) {
      writeStartSegment(
        destination,
        request.renderState,
        segment.parentFormatContext,
        segment.id
      );
      flushSegment(request, destination, segment, hoistableState);
      return writeEndSegment(destination, segment.parentFormatContext);
    }
    function flushCompletedBoundary(request, destination, boundary) {
      flushedByteSize = boundary.byteSize;
      for (var completedSegments = boundary.completedSegments, i = 0; i < completedSegments.length; i++)
        flushPartiallyCompletedSegment(
          request,
          destination,
          boundary,
          completedSegments[i]
        );
      completedSegments.length = 0;
      completedSegments = boundary.row;
      null !== completedSegments && isEligibleForOutlining(request, boundary) && 0 === --completedSegments.pendingTasks && finishSuspenseListRow(request, completedSegments);
      writeHoistablesForBoundary(
        destination,
        boundary.contentState,
        request.renderState
      );
      completedSegments = request.resumableState;
      request = request.renderState;
      i = boundary.rootSegmentID;
      boundary = boundary.contentState;
      var requiresStyleInsertion = request.stylesToHoist;
      request.stylesToHoist = false;
      writeChunk(destination, request.startInlineScript);
      writeChunk(destination, endOfStartTag);
      requiresStyleInsertion ? (0 === (completedSegments.instructions & 4) && (completedSegments.instructions |= 4, writeChunk(destination, clientRenderScriptFunctionOnly)), 0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, writeChunk(destination, completeBoundaryScriptFunctionOnly)), 0 === (completedSegments.instructions & 8) ? (completedSegments.instructions |= 8, writeChunk(destination, completeBoundaryWithStylesScript1FullPartial)) : writeChunk(destination, completeBoundaryWithStylesScript1Partial)) : (0 === (completedSegments.instructions & 2) && (completedSegments.instructions |= 2, writeChunk(destination, completeBoundaryScriptFunctionOnly)), writeChunk(destination, completeBoundaryScript1Partial));
      completedSegments = i.toString(16);
      writeChunk(destination, request.boundaryPrefix);
      writeChunk(destination, completedSegments);
      writeChunk(destination, completeBoundaryScript2);
      writeChunk(destination, request.segmentPrefix);
      writeChunk(destination, completedSegments);
      requiresStyleInsertion ? (writeChunk(destination, completeBoundaryScript3a), writeStyleResourceDependenciesInJS(destination, boundary)) : writeChunk(destination, completeBoundaryScript3b);
      boundary = writeChunkAndReturn(destination, completeBoundaryScriptEnd);
      return writeBootstrap(destination, request) && boundary;
    }
    function flushPartiallyCompletedSegment(request, destination, boundary, segment) {
      if (2 === segment.status) return true;
      var hoistableState = boundary.contentState, segmentID = segment.id;
      if (-1 === segmentID) {
        if (-1 === (segment.id = boundary.rootSegmentID))
          throw Error(
            "A root segment ID must have been assigned by now. This is a bug in React."
          );
        return flushSegmentContainer(request, destination, segment, hoistableState);
      }
      if (segmentID === boundary.rootSegmentID)
        return flushSegmentContainer(request, destination, segment, hoistableState);
      flushSegmentContainer(request, destination, segment, hoistableState);
      boundary = request.resumableState;
      request = request.renderState;
      writeChunk(destination, request.startInlineScript);
      writeChunk(destination, endOfStartTag);
      0 === (boundary.instructions & 1) ? (boundary.instructions |= 1, writeChunk(destination, completeSegmentScript1Full)) : writeChunk(destination, completeSegmentScript1Partial);
      writeChunk(destination, request.segmentPrefix);
      segmentID = segmentID.toString(16);
      writeChunk(destination, segmentID);
      writeChunk(destination, completeSegmentScript2);
      writeChunk(destination, request.placeholderPrefix);
      writeChunk(destination, segmentID);
      destination = writeChunkAndReturn(destination, completeSegmentScriptEnd);
      return destination;
    }
    var flushingPartialBoundaries = false;
    function flushCompletedQueues(request, destination) {
      currentView = new Uint8Array(2048);
      writtenBytes = 0;
      destinationHasCapacity$1 = true;
      try {
        if (!(0 < request.pendingRootTasks)) {
          var i, completedRootSegment = request.completedRootSegment;
          if (null !== completedRootSegment) {
            if (5 === completedRootSegment.status) return;
            var completedPreambleSegments = request.completedPreambleSegments;
            if (null === completedPreambleSegments) return;
            flushedByteSize = request.byteSize;
            var resumableState = request.resumableState, renderState = request.renderState, preamble = renderState.preamble, htmlChunks = preamble.htmlChunks, headChunks = preamble.headChunks, i$jscomp$0;
            if (htmlChunks) {
              for (i$jscomp$0 = 0; i$jscomp$0 < htmlChunks.length; i$jscomp$0++)
                writeChunk(destination, htmlChunks[i$jscomp$0]);
              if (headChunks)
                for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
                  writeChunk(destination, headChunks[i$jscomp$0]);
              else
                writeChunk(destination, startChunkForTag("head")), writeChunk(destination, endOfStartTag);
            } else if (headChunks)
              for (i$jscomp$0 = 0; i$jscomp$0 < headChunks.length; i$jscomp$0++)
                writeChunk(destination, headChunks[i$jscomp$0]);
            var charsetChunks = renderState.charsetChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < charsetChunks.length; i$jscomp$0++)
              writeChunk(destination, charsetChunks[i$jscomp$0]);
            charsetChunks.length = 0;
            renderState.preconnects.forEach(flushResource, destination);
            renderState.preconnects.clear();
            var viewportChunks = renderState.viewportChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < viewportChunks.length; i$jscomp$0++)
              writeChunk(destination, viewportChunks[i$jscomp$0]);
            viewportChunks.length = 0;
            renderState.fontPreloads.forEach(flushResource, destination);
            renderState.fontPreloads.clear();
            renderState.highImagePreloads.forEach(flushResource, destination);
            renderState.highImagePreloads.clear();
            currentlyFlushingRenderState = renderState;
            renderState.styles.forEach(flushStylesInPreamble, destination);
            currentlyFlushingRenderState = null;
            var importMapChunks = renderState.importMapChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < importMapChunks.length; i$jscomp$0++)
              writeChunk(destination, importMapChunks[i$jscomp$0]);
            importMapChunks.length = 0;
            renderState.bootstrapScripts.forEach(flushResource, destination);
            renderState.scripts.forEach(flushResource, destination);
            renderState.scripts.clear();
            renderState.bulkPreloads.forEach(flushResource, destination);
            renderState.bulkPreloads.clear();
            htmlChunks || headChunks || (resumableState.instructions |= 32);
            var hoistableChunks = renderState.hoistableChunks;
            for (i$jscomp$0 = 0; i$jscomp$0 < hoistableChunks.length; i$jscomp$0++)
              writeChunk(destination, hoistableChunks[i$jscomp$0]);
            for (resumableState = hoistableChunks.length = 0; resumableState < completedPreambleSegments.length; resumableState++) {
              var segments = completedPreambleSegments[resumableState];
              for (renderState = 0; renderState < segments.length; renderState++)
                flushSegment(request, destination, segments[renderState], null);
            }
            var preamble$jscomp$0 = request.renderState.preamble, headChunks$jscomp$0 = preamble$jscomp$0.headChunks;
            (preamble$jscomp$0.htmlChunks || headChunks$jscomp$0) && writeChunk(destination, endChunkForTag("head"));
            var bodyChunks = preamble$jscomp$0.bodyChunks;
            if (bodyChunks)
              for (completedPreambleSegments = 0; completedPreambleSegments < bodyChunks.length; completedPreambleSegments++)
                writeChunk(destination, bodyChunks[completedPreambleSegments]);
            flushSegment(request, destination, completedRootSegment, null);
            request.completedRootSegment = null;
            var renderState$jscomp$0 = request.renderState;
            if (0 !== request.allPendingTasks || 0 !== request.clientRenderedBoundaries.length || 0 !== request.completedBoundaries.length || null !== request.trackedPostpones && (0 !== request.trackedPostpones.rootNodes.length || null !== request.trackedPostpones.rootSlots)) {
              var resumableState$jscomp$0 = request.resumableState;
              if (0 === (resumableState$jscomp$0.instructions & 64)) {
                resumableState$jscomp$0.instructions |= 64;
                writeChunk(destination, renderState$jscomp$0.startInlineScript);
                if (0 === (resumableState$jscomp$0.instructions & 32)) {
                  resumableState$jscomp$0.instructions |= 32;
                  var shellId = "_" + resumableState$jscomp$0.idPrefix + "R_";
                  writeChunk(destination, completedShellIdAttributeStart);
                  writeChunk(destination, escapeTextForBrowser(shellId));
                  writeChunk(destination, attributeEnd);
                }
                writeChunk(destination, endOfStartTag);
                writeChunk(destination, shellTimeRuntimeScript);
                writeChunkAndReturn(destination, endInlineScript);
              }
            }
            writeBootstrap(destination, renderState$jscomp$0);
          }
          var renderState$jscomp$1 = request.renderState;
          completedRootSegment = 0;
          var viewportChunks$jscomp$0 = renderState$jscomp$1.viewportChunks;
          for (completedRootSegment = 0; completedRootSegment < viewportChunks$jscomp$0.length; completedRootSegment++)
            writeChunk(destination, viewportChunks$jscomp$0[completedRootSegment]);
          viewportChunks$jscomp$0.length = 0;
          renderState$jscomp$1.preconnects.forEach(flushResource, destination);
          renderState$jscomp$1.preconnects.clear();
          renderState$jscomp$1.fontPreloads.forEach(flushResource, destination);
          renderState$jscomp$1.fontPreloads.clear();
          renderState$jscomp$1.highImagePreloads.forEach(
            flushResource,
            destination
          );
          renderState$jscomp$1.highImagePreloads.clear();
          renderState$jscomp$1.styles.forEach(preloadLateStyles, destination);
          renderState$jscomp$1.scripts.forEach(flushResource, destination);
          renderState$jscomp$1.scripts.clear();
          renderState$jscomp$1.bulkPreloads.forEach(flushResource, destination);
          renderState$jscomp$1.bulkPreloads.clear();
          var hoistableChunks$jscomp$0 = renderState$jscomp$1.hoistableChunks;
          for (completedRootSegment = 0; completedRootSegment < hoistableChunks$jscomp$0.length; completedRootSegment++)
            writeChunk(destination, hoistableChunks$jscomp$0[completedRootSegment]);
          hoistableChunks$jscomp$0.length = 0;
          var clientRenderedBoundaries = request.clientRenderedBoundaries;
          for (i = 0; i < clientRenderedBoundaries.length; i++) {
            var boundary = clientRenderedBoundaries[i];
            renderState$jscomp$1 = destination;
            var resumableState$jscomp$1 = request.resumableState, renderState$jscomp$2 = request.renderState, id = boundary.rootSegmentID, errorDigest = boundary.errorDigest;
            writeChunk(
              renderState$jscomp$1,
              renderState$jscomp$2.startInlineScript
            );
            writeChunk(renderState$jscomp$1, endOfStartTag);
            0 === (resumableState$jscomp$1.instructions & 4) ? (resumableState$jscomp$1.instructions |= 4, writeChunk(renderState$jscomp$1, clientRenderScript1Full)) : writeChunk(renderState$jscomp$1, clientRenderScript1Partial);
            writeChunk(renderState$jscomp$1, renderState$jscomp$2.boundaryPrefix);
            writeChunk(renderState$jscomp$1, id.toString(16));
            writeChunk(renderState$jscomp$1, clientRenderScript1A);
            errorDigest && (writeChunk(
              renderState$jscomp$1,
              clientRenderErrorScriptArgInterstitial
            ), writeChunk(
              renderState$jscomp$1,
              escapeJSStringsForInstructionScripts(errorDigest || "")
            ));
            var JSCompiler_inline_result = writeChunkAndReturn(
              renderState$jscomp$1,
              clientRenderScriptEnd
            );
            if (!JSCompiler_inline_result) {
              request.destination = null;
              i++;
              clientRenderedBoundaries.splice(0, i);
              return;
            }
          }
          clientRenderedBoundaries.splice(0, i);
          var completedBoundaries = request.completedBoundaries;
          for (i = 0; i < completedBoundaries.length; i++)
            if (!flushCompletedBoundary(request, destination, completedBoundaries[i])) {
              request.destination = null;
              i++;
              completedBoundaries.splice(0, i);
              return;
            }
          completedBoundaries.splice(0, i);
          completeWriting(destination);
          currentView = new Uint8Array(2048);
          writtenBytes = 0;
          flushingPartialBoundaries = destinationHasCapacity$1 = true;
          var partialBoundaries = request.partialBoundaries;
          for (i = 0; i < partialBoundaries.length; i++) {
            var boundary$70 = partialBoundaries[i];
            a: {
              clientRenderedBoundaries = request;
              boundary = destination;
              flushedByteSize = boundary$70.byteSize;
              var completedSegments = boundary$70.completedSegments;
              for (JSCompiler_inline_result = 0; JSCompiler_inline_result < completedSegments.length; JSCompiler_inline_result++)
                if (!flushPartiallyCompletedSegment(
                  clientRenderedBoundaries,
                  boundary,
                  boundary$70,
                  completedSegments[JSCompiler_inline_result]
                )) {
                  JSCompiler_inline_result++;
                  completedSegments.splice(0, JSCompiler_inline_result);
                  var JSCompiler_inline_result$jscomp$0 = false;
                  break a;
                }
              completedSegments.splice(0, JSCompiler_inline_result);
              var row = boundary$70.row;
              null !== row && row.together && 1 === boundary$70.pendingTasks && (1 === row.pendingTasks ? unblockSuspenseListRow(
                clientRenderedBoundaries,
                row,
                row.hoistables
              ) : row.pendingTasks--);
              JSCompiler_inline_result$jscomp$0 = writeHoistablesForBoundary(
                boundary,
                boundary$70.contentState,
                clientRenderedBoundaries.renderState
              );
            }
            if (!JSCompiler_inline_result$jscomp$0) {
              request.destination = null;
              i++;
              partialBoundaries.splice(0, i);
              return;
            }
          }
          partialBoundaries.splice(0, i);
          flushingPartialBoundaries = false;
          var largeBoundaries = request.completedBoundaries;
          for (i = 0; i < largeBoundaries.length; i++)
            if (!flushCompletedBoundary(request, destination, largeBoundaries[i])) {
              request.destination = null;
              i++;
              largeBoundaries.splice(0, i);
              return;
            }
          largeBoundaries.splice(0, i);
        }
      } finally {
        flushingPartialBoundaries = false, 0 === request.allPendingTasks && 0 === request.clientRenderedBoundaries.length && 0 === request.completedBoundaries.length ? (request.flushScheduled = false, i = request.resumableState, i.hasBody && writeChunk(destination, endChunkForTag("body")), i.hasHtml && writeChunk(destination, endChunkForTag("html")), completeWriting(destination), flushBuffered(destination), request.status = 14, destination.end(), request.destination = null) : (completeWriting(destination), flushBuffered(destination));
      }
    }
    function startWork(request) {
      request.flushScheduled = null !== request.destination;
      scheduleMicrotask(function() {
        return requestStorage.run(request, performWork, request);
      });
      setImmediate(function() {
        10 === request.status && (request.status = 11);
        null === request.trackedPostpones && requestStorage.run(
          request,
          enqueueEarlyPreloadsAfterInitialWork,
          request
        );
      });
    }
    function enqueueEarlyPreloadsAfterInitialWork(request) {
      safelyEmitEarlyPreloads(request, 0 === request.pendingRootTasks);
    }
    function enqueueFlush(request) {
      false === request.flushScheduled && 0 === request.pingedTasks.length && null !== request.destination && (request.flushScheduled = true, setImmediate(function() {
        var destination = request.destination;
        destination ? flushCompletedQueues(request, destination) : request.flushScheduled = false;
      }));
    }
    function startFlowing(request, destination) {
      if (13 === request.status)
        request.status = 14, destination.destroy(request.fatalError);
      else if (14 !== request.status && null === request.destination) {
        request.destination = destination;
        try {
          flushCompletedQueues(request, destination);
        } catch (error) {
          logRecoverableError(request, error, {}), fatalError(request, error);
        }
      }
    }
    function abort(request, reason) {
      if (11 === request.status || 10 === request.status) request.status = 12;
      try {
        var abortableTasks = request.abortableTasks;
        if (0 < abortableTasks.size) {
          var error = void 0 === reason ? Error("The render was aborted by the server without a reason.") : "object" === typeof reason && null !== reason && "function" === typeof reason.then ? Error("The render was aborted by the server with a promise.") : reason;
          request.fatalError = error;
          abortableTasks.forEach(function(task) {
            return abortTask(task, request, error);
          });
          abortableTasks.clear();
        }
        null !== request.destination && flushCompletedQueues(request, request.destination);
      } catch (error$72) {
        logRecoverableError(request, error$72, {}), fatalError(request, error$72);
      }
    }
    function addToReplayParent(node, parentKeyPath, trackedPostpones) {
      if (null === parentKeyPath) trackedPostpones.rootNodes.push(node);
      else {
        var workingMap = trackedPostpones.workingMap, parentNode = workingMap.get(parentKeyPath);
        void 0 === parentNode && (parentNode = [parentKeyPath[1], parentKeyPath[2], [], null], workingMap.set(parentKeyPath, parentNode), addToReplayParent(parentNode, parentKeyPath[0], trackedPostpones));
        parentNode[2].push(node);
      }
    }
    function getPostponedState(request) {
      var trackedPostpones = request.trackedPostpones;
      if (null === trackedPostpones || 0 === trackedPostpones.rootNodes.length && null === trackedPostpones.rootSlots)
        return request.trackedPostpones = null;
      if (null === request.completedRootSegment || 5 !== request.completedRootSegment.status && null !== request.completedPreambleSegments) {
        var nextSegmentId = request.nextSegmentId;
        var replaySlots = trackedPostpones.rootSlots;
        var resumableState = request.resumableState;
        resumableState.bootstrapScriptContent = void 0;
        resumableState.bootstrapScripts = void 0;
        resumableState.bootstrapModules = void 0;
      } else {
        nextSegmentId = 0;
        replaySlots = -1;
        resumableState = request.resumableState;
        var renderState = request.renderState;
        resumableState.nextFormID = 0;
        resumableState.hasBody = false;
        resumableState.hasHtml = false;
        resumableState.unknownResources = { font: renderState.resets.font };
        resumableState.dnsResources = renderState.resets.dns;
        resumableState.connectResources = renderState.resets.connect;
        resumableState.imageResources = renderState.resets.image;
        resumableState.styleResources = renderState.resets.style;
        resumableState.scriptResources = {};
        resumableState.moduleUnknownResources = {};
        resumableState.moduleScriptResources = {};
        resumableState.instructions = 0;
      }
      return {
        nextSegmentId,
        rootFormatContext: request.rootFormatContext,
        progressiveChunkSize: request.progressiveChunkSize,
        resumableState: request.resumableState,
        replayNodes: trackedPostpones.rootNodes,
        replaySlots
      };
    }
    function ensureCorrectIsomorphicReactVersion() {
      var isomorphicReactPackageVersion = React2.version;
      if ("19.2.8" !== isomorphicReactPackageVersion)
        throw Error(
          'Incompatible React versions: The "react" and "react-dom" packages must have the exact same version. Instead got:\n  - react:      ' + (isomorphicReactPackageVersion + "\n  - react-dom:  19.2.8\nLearn more: https://react.dev/warnings/version-mismatch")
        );
    }
    ensureCorrectIsomorphicReactVersion();
    function createDrainHandler(destination, request) {
      return function() {
        return startFlowing(request, destination);
      };
    }
    function createCancelHandler(request, reason) {
      return function() {
        request.destination = null;
        abort(request, Error(reason));
      };
    }
    function createRequestImpl(children, options) {
      var resumableState = createResumableState(
        options ? options.identifierPrefix : void 0,
        options ? options.unstable_externalRuntimeSrc : void 0,
        options ? options.bootstrapScriptContent : void 0,
        options ? options.bootstrapScripts : void 0,
        options ? options.bootstrapModules : void 0
      );
      return createRequest(
        children,
        resumableState,
        createRenderState(
          resumableState,
          options ? options.nonce : void 0,
          options ? options.unstable_externalRuntimeSrc : void 0,
          options ? options.importMap : void 0,
          options ? options.onHeaders : void 0,
          options ? options.maxHeadersLength : void 0
        ),
        createRootFormatContext(options ? options.namespaceURI : void 0),
        options ? options.progressiveChunkSize : void 0,
        options ? options.onError : void 0,
        options ? options.onAllReady : void 0,
        options ? options.onShellReady : void 0,
        options ? options.onShellError : void 0,
        void 0,
        options ? options.onPostpone : void 0,
        options ? options.formState : void 0
      );
    }
    function createFakeWritableFromReadableStreamController$1(controller) {
      return {
        write: function(chunk) {
          "string" === typeof chunk && (chunk = textEncoder.encode(chunk));
          controller.enqueue(chunk);
          return true;
        },
        end: function() {
          controller.close();
        },
        destroy: function(error) {
          "function" === typeof controller.error ? controller.error(error) : controller.close();
        }
      };
    }
    function resumeRequestImpl(children, postponedState, options) {
      return resumeRequest(
        children,
        postponedState,
        createRenderState(
          postponedState.resumableState,
          options ? options.nonce : void 0,
          void 0,
          void 0,
          void 0,
          void 0
        ),
        options ? options.onError : void 0,
        options ? options.onAllReady : void 0,
        options ? options.onShellReady : void 0,
        options ? options.onShellError : void 0,
        void 0,
        options ? options.onPostpone : void 0
      );
    }
    ensureCorrectIsomorphicReactVersion();
    function createFakeWritableFromReadableStreamController(controller) {
      return {
        write: function(chunk) {
          "string" === typeof chunk && (chunk = textEncoder.encode(chunk));
          controller.enqueue(chunk);
          return true;
        },
        end: function() {
          controller.close();
        },
        destroy: function(error) {
          "function" === typeof controller.error ? controller.error(error) : controller.close();
        }
      };
    }
    function createFakeWritableFromReadable(readable) {
      return {
        write: function(chunk) {
          return readable.push(chunk);
        },
        end: function() {
          readable.push(null);
        },
        destroy: function(error) {
          readable.destroy(error);
        }
      };
    }
    exports.prerender = function(children, options) {
      return new Promise(function(resolve, reject) {
        var onHeaders = options ? options.onHeaders : void 0, onHeadersImpl;
        onHeaders && (onHeadersImpl = function(headersDescriptor) {
          onHeaders(new Headers(headersDescriptor));
        });
        var resources = createResumableState(
          options ? options.identifierPrefix : void 0,
          options ? options.unstable_externalRuntimeSrc : void 0,
          options ? options.bootstrapScriptContent : void 0,
          options ? options.bootstrapScripts : void 0,
          options ? options.bootstrapModules : void 0
        ), request = createPrerenderRequest(
          children,
          resources,
          createRenderState(
            resources,
            void 0,
            options ? options.unstable_externalRuntimeSrc : void 0,
            options ? options.importMap : void 0,
            onHeadersImpl,
            options ? options.maxHeadersLength : void 0
          ),
          createRootFormatContext(options ? options.namespaceURI : void 0),
          options ? options.progressiveChunkSize : void 0,
          options ? options.onError : void 0,
          function() {
            var writable, stream2 = new ReadableStream(
              {
                type: "bytes",
                start: function(controller) {
                  writable = createFakeWritableFromReadableStreamController(controller);
                },
                pull: function() {
                  startFlowing(request, writable);
                },
                cancel: function(reason) {
                  request.destination = null;
                  abort(request, reason);
                }
              },
              { highWaterMark: 0 }
            );
            stream2 = { postponed: getPostponedState(request), prelude: stream2 };
            resolve(stream2);
          },
          void 0,
          void 0,
          reject,
          options ? options.onPostpone : void 0
        );
        if (options && options.signal) {
          var signal = options.signal;
          if (signal.aborted) abort(request, signal.reason);
          else {
            var listener = function() {
              abort(request, signal.reason);
              signal.removeEventListener("abort", listener);
            };
            signal.addEventListener("abort", listener);
          }
        }
        startWork(request);
      });
    };
    exports.prerenderToNodeStream = function(children, options) {
      return new Promise(function(resolve, reject) {
        var resumableState = createResumableState(
          options ? options.identifierPrefix : void 0,
          options ? options.unstable_externalRuntimeSrc : void 0,
          options ? options.bootstrapScriptContent : void 0,
          options ? options.bootstrapScripts : void 0,
          options ? options.bootstrapModules : void 0
        ), request = createPrerenderRequest(
          children,
          resumableState,
          createRenderState(
            resumableState,
            void 0,
            options ? options.unstable_externalRuntimeSrc : void 0,
            options ? options.importMap : void 0,
            options ? options.onHeaders : void 0,
            options ? options.maxHeadersLength : void 0
          ),
          createRootFormatContext(options ? options.namespaceURI : void 0),
          options ? options.progressiveChunkSize : void 0,
          options ? options.onError : void 0,
          function() {
            var readable = new stream.Readable({
              read: function() {
                startFlowing(request, writable);
              }
            }), writable = createFakeWritableFromReadable(readable);
            readable = {
              postponed: getPostponedState(request),
              prelude: readable
            };
            resolve(readable);
          },
          void 0,
          void 0,
          reject,
          options ? options.onPostpone : void 0
        );
        if (options && options.signal) {
          var signal = options.signal;
          if (signal.aborted) abort(request, signal.reason);
          else {
            var listener = function() {
              abort(request, signal.reason);
              signal.removeEventListener("abort", listener);
            };
            signal.addEventListener("abort", listener);
          }
        }
        startWork(request);
      });
    };
    exports.renderToPipeableStream = function(children, options) {
      var request = createRequestImpl(children, options), hasStartedFlowing = false;
      startWork(request);
      return {
        pipe: function(destination) {
          if (hasStartedFlowing)
            throw Error(
              "React currently only supports piping to one writable stream."
            );
          hasStartedFlowing = true;
          safelyEmitEarlyPreloads(
            request,
            null === request.trackedPostpones ? 0 === request.pendingRootTasks : null === request.completedRootSegment ? 0 === request.pendingRootTasks : 5 !== request.completedRootSegment.status
          );
          startFlowing(request, destination);
          destination.on("drain", createDrainHandler(destination, request));
          destination.on(
            "error",
            createCancelHandler(
              request,
              "The destination stream errored while writing data."
            )
          );
          destination.on(
            "close",
            createCancelHandler(request, "The destination stream closed early.")
          );
          return destination;
        },
        abort: function(reason) {
          abort(request, reason);
        }
      };
    };
    exports.renderToReadableStream = function(children, options) {
      return new Promise(function(resolve, reject) {
        var onFatalError, onAllReady, allReady = new Promise(function(res, rej) {
          onAllReady = res;
          onFatalError = rej;
        }), onHeaders = options ? options.onHeaders : void 0, onHeadersImpl;
        onHeaders && (onHeadersImpl = function(headersDescriptor) {
          onHeaders(new Headers(headersDescriptor));
        });
        var resumableState = createResumableState(
          options ? options.identifierPrefix : void 0,
          options ? options.unstable_externalRuntimeSrc : void 0,
          options ? options.bootstrapScriptContent : void 0,
          options ? options.bootstrapScripts : void 0,
          options ? options.bootstrapModules : void 0
        ), request = createRequest(
          children,
          resumableState,
          createRenderState(
            resumableState,
            options ? options.nonce : void 0,
            options ? options.unstable_externalRuntimeSrc : void 0,
            options ? options.importMap : void 0,
            onHeadersImpl,
            options ? options.maxHeadersLength : void 0
          ),
          createRootFormatContext(options ? options.namespaceURI : void 0),
          options ? options.progressiveChunkSize : void 0,
          options ? options.onError : void 0,
          onAllReady,
          function() {
            var writable, stream2 = new ReadableStream(
              {
                type: "bytes",
                start: function(controller) {
                  writable = createFakeWritableFromReadableStreamController$1(
                    controller
                  );
                },
                pull: function() {
                  startFlowing(request, writable);
                },
                cancel: function(reason) {
                  request.destination = null;
                  abort(request, reason);
                }
              },
              { highWaterMark: 0 }
            );
            stream2.allReady = allReady;
            resolve(stream2);
          },
          function(error) {
            allReady.catch(function() {
            });
            reject(error);
          },
          onFatalError,
          options ? options.onPostpone : void 0,
          options ? options.formState : void 0
        );
        if (options && options.signal) {
          var signal = options.signal;
          if (signal.aborted) abort(request, signal.reason);
          else {
            var listener = function() {
              abort(request, signal.reason);
              signal.removeEventListener("abort", listener);
            };
            signal.addEventListener("abort", listener);
          }
        }
        startWork(request);
      });
    };
    exports.resume = function(children, postponedState, options) {
      return new Promise(function(resolve, reject) {
        var onFatalError, onAllReady, allReady = new Promise(function(res, rej) {
          onAllReady = res;
          onFatalError = rej;
        }), request = resumeRequest(
          children,
          postponedState,
          createRenderState(
            postponedState.resumableState,
            options ? options.nonce : void 0,
            void 0,
            void 0,
            void 0,
            void 0
          ),
          options ? options.onError : void 0,
          onAllReady,
          function() {
            var writable, stream2 = new ReadableStream(
              {
                type: "bytes",
                start: function(controller) {
                  writable = createFakeWritableFromReadableStreamController$1(
                    controller
                  );
                },
                pull: function() {
                  startFlowing(request, writable);
                },
                cancel: function(reason) {
                  request.destination = null;
                  abort(request, reason);
                }
              },
              { highWaterMark: 0 }
            );
            stream2.allReady = allReady;
            resolve(stream2);
          },
          function(error) {
            allReady.catch(function() {
            });
            reject(error);
          },
          onFatalError,
          options ? options.onPostpone : void 0
        );
        if (options && options.signal) {
          var signal = options.signal;
          if (signal.aborted) abort(request, signal.reason);
          else {
            var listener = function() {
              abort(request, signal.reason);
              signal.removeEventListener("abort", listener);
            };
            signal.addEventListener("abort", listener);
          }
        }
        startWork(request);
      });
    };
    exports.resumeAndPrerender = function(children, postponedState, options) {
      return new Promise(function(resolve, reject) {
        var request = resumeAndPrerenderRequest(
          children,
          postponedState,
          createRenderState(
            postponedState.resumableState,
            void 0,
            void 0,
            void 0,
            void 0,
            void 0
          ),
          options ? options.onError : void 0,
          function() {
            var writable, stream2 = new ReadableStream(
              {
                type: "bytes",
                start: function(controller) {
                  writable = createFakeWritableFromReadableStreamController(controller);
                },
                pull: function() {
                  startFlowing(request, writable);
                },
                cancel: function(reason) {
                  request.destination = null;
                  abort(request, reason);
                }
              },
              { highWaterMark: 0 }
            );
            stream2 = { postponed: getPostponedState(request), prelude: stream2 };
            resolve(stream2);
          },
          void 0,
          void 0,
          reject,
          options ? options.onPostpone : void 0
        );
        if (options && options.signal) {
          var signal = options.signal;
          if (signal.aborted) abort(request, signal.reason);
          else {
            var listener = function() {
              abort(request, signal.reason);
              signal.removeEventListener("abort", listener);
            };
            signal.addEventListener("abort", listener);
          }
        }
        startWork(request);
      });
    };
    exports.resumeAndPrerenderToNodeStream = function(children, postponedState, options) {
      return new Promise(function(resolve, reject) {
        var request = resumeAndPrerenderRequest(
          children,
          postponedState,
          createRenderState(
            postponedState.resumableState,
            void 0,
            void 0,
            void 0,
            void 0,
            void 0
          ),
          options ? options.onError : void 0,
          function() {
            var readable = new stream.Readable({
              read: function() {
                startFlowing(request, writable);
              }
            }), writable = createFakeWritableFromReadable(readable);
            readable = { postponed: getPostponedState(request), prelude: readable };
            resolve(readable);
          },
          void 0,
          void 0,
          reject,
          options ? options.onPostpone : void 0
        );
        if (options && options.signal) {
          var signal = options.signal;
          if (signal.aborted) abort(request, signal.reason);
          else {
            var listener = function() {
              abort(request, signal.reason);
              signal.removeEventListener("abort", listener);
            };
            signal.addEventListener("abort", listener);
          }
        }
        startWork(request);
      });
    };
    exports.resumeToPipeableStream = function(children, postponedState, options) {
      var request = resumeRequestImpl(children, postponedState, options), hasStartedFlowing = false;
      startWork(request);
      return {
        pipe: function(destination) {
          if (hasStartedFlowing)
            throw Error(
              "React currently only supports piping to one writable stream."
            );
          hasStartedFlowing = true;
          startFlowing(request, destination);
          destination.on("drain", createDrainHandler(destination, request));
          destination.on(
            "error",
            createCancelHandler(
              request,
              "The destination stream errored while writing data."
            )
          );
          destination.on(
            "close",
            createCancelHandler(request, "The destination stream closed early.")
          );
          return destination;
        },
        abort: function(reason) {
          abort(request, reason);
        }
      };
    };
    exports.version = "19.2.8";
  }
});

// node_modules/react-dom/server.node.js
var require_server_node = __commonJS({
  "node_modules/react-dom/server.node.js"(exports) {
    "use strict";
    var l;
    var s;
    if (true) {
      l = require_react_dom_server_legacy_node_production();
      s = require_react_dom_server_node_production();
    } else {
      l = null;
      s = null;
    }
    exports.version = l.version;
    exports.renderToString = l.renderToString;
    exports.renderToStaticMarkup = l.renderToStaticMarkup;
    exports.renderToPipeableStream = s.renderToPipeableStream;
    exports.renderToReadableStream = s.renderToReadableStream;
    exports.resumeToPipeableStream = s.resumeToPipeableStream;
    exports.resume = s.resume;
  }
});

// node_modules/react/cjs/react-jsx-runtime.production.js
var require_react_jsx_runtime_production = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.production.js"(exports) {
    "use strict";
    var REACT_ELEMENT_TYPE = /* @__PURE__ */ Symbol.for("react.transitional.element");
    var REACT_FRAGMENT_TYPE = /* @__PURE__ */ Symbol.for("react.fragment");
    function jsxProd(type, config, maybeKey) {
      var key = null;
      void 0 !== maybeKey && (key = "" + maybeKey);
      void 0 !== config.key && (key = "" + config.key);
      if ("key" in config) {
        maybeKey = {};
        for (var propName in config)
          "key" !== propName && (maybeKey[propName] = config[propName]);
      } else maybeKey = config;
      config = maybeKey.ref;
      return {
        $$typeof: REACT_ELEMENT_TYPE,
        type,
        key,
        ref: void 0 !== config ? config : null,
        props: maybeKey
      };
    }
    exports.Fragment = REACT_FRAGMENT_TYPE;
    exports.jsx = jsxProd;
    exports.jsxs = jsxProd;
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports, module) {
    "use strict";
    if (true) {
      module.exports = require_react_jsx_runtime_production();
    } else {
      module.exports = null;
    }
  }
});

// src/ssr/renderSlideHtml.tsx
var import_server = __toESM(require_server_node(), 1);

// src/pages/Result/components/content/carousel/IGSlide.tsx
var import_react = __toESM(require_react(), 1);

// src/pages/Result/components/content/carousel/igslide/presets.ts
var DESIGN_PRESETS = [
  { contentStart: 0, contentForce: 0, cover: 0, bgBias: "alternate" },
  //  0 Classic editorial
  { contentStart: 0, contentForce: 1, cover: 1, bgBias: "mostly-dark" },
  //  1 Bold dark banner emoji
  { contentStart: 0, contentForce: 2, cover: 0, bgBias: "mostly-light" },
  //  2 Clean card brand
  { contentStart: 0, contentForce: null, cover: 0, bgBias: "alternate" },
  //  3 Full cycle alternating brand
  { contentStart: 1, contentForce: null, cover: 1, bgBias: "mostly-dark" },
  //  4 B→C→A cycle dark emoji
  { contentStart: 2, contentForce: null, cover: 0, bgBias: "mostly-light" },
  //  5 C→A→B cycle light brand
  { contentStart: 0, contentForce: 0, cover: 1, bgBias: "mostly-dark" },
  //  6 Stripe dark emoji
  { contentStart: 0, contentForce: 1, cover: 0, bgBias: "mostly-light" },
  //  7 Banner light brand
  { contentStart: 0, contentForce: 2, cover: 1, bgBias: "mostly-dark" },
  //  8 Card dark emoji
  { contentStart: 0, contentForce: null, cover: 1, bgBias: "mostly-light" },
  //  9 A→B→C cycle light emoji
  { contentStart: 1, contentForce: null, cover: 0, bgBias: "alternate" },
  // 10 B→C→A cycle alternating brand
  { contentStart: 2, contentForce: null, cover: 1, bgBias: "mostly-dark" },
  // 11 C→A→B cycle dark emoji
  { contentStart: 0, contentForce: 0, cover: 0, bgBias: "mostly-light" },
  // 12 Stripe light brand
  { contentStart: 0, contentForce: 1, cover: 1, bgBias: "alternate" },
  // 13 Banner alternating emoji
  { contentStart: 0, contentForce: 2, cover: 0, bgBias: "alternate" },
  // 14 Card alternating brand
  { contentStart: 1, contentForce: null, cover: 1, bgBias: "mostly-light" },
  // 15 B→C→A cycle light emoji
  { contentStart: 2, contentForce: null, cover: 0, bgBias: "mostly-dark" },
  // 16 C→A→B cycle dark brand
  { contentStart: 0, contentForce: 0, cover: 1, bgBias: "mostly-light" },
  // 17 Stripe light emoji
  { contentStart: 0, contentForce: 2, cover: 1, bgBias: "mostly-light" },
  // 18 Card light emoji
  { contentStart: 2, contentForce: null, cover: 1, bgBias: "alternate" }
  // 19 C→A→B cycle alternating emoji
];

// src/pages/Result/components/content/carousel/igslide/constants.ts
var FONT = "'Plus Jakarta Sans',system-ui,sans-serif";
var PROGRESS_H = 40;
var BOTTOM_PAD = 52;
var H_PAD = 28;
var GLOW_PRESETS = [
  { x: "85%", y: "10%", size: 180 },
  { x: "15%", y: "75%", size: 200 },
  { x: "70%", y: "50%", size: 165 },
  { x: "30%", y: "20%", size: 210 }
];

// src/pages/Result/components/content/carousel/igslide/slideResolvers.ts
var ACCENT_ANGLES = [165, 135, 225, 45, 200, 315, 90];
function resolveAccentGradient(index, colors) {
  const angle = ACCENT_ANGLES[index % ACCENT_ANGLES.length];
  return `linear-gradient(${angle}deg, ${colors.BRAND_DARK} 0%, ${colors.BRAND_PRIMARY} 55%, ${colors.BRAND_LIGHT} 100%)`;
}
function resolveType(slide, idx, total) {
  return slide.type || (idx === 0 ? "cover" : idx === total - 1 ? "cta" : "content");
}
function resolveBackground(slide, idx, total, preset, colors) {
  const type = resolveType(slide, idx, total);
  if (slide.bg_suggestion === "accent") return { bgMode: "accent", background: resolveAccentGradient(idx, colors) };
  if (slide.bg_suggestion === "dark") return { bgMode: "dark", background: colors.DARK_BG };
  if (slide.bg_suggestion === "light") return { bgMode: "light", background: colors.LIGHT_BG };
  if (type === "cta" || type === "solution")
    return { bgMode: "accent", background: resolveAccentGradient(idx, colors) };
  if (type === "cover" || type === "howto" || type === "features" || type === "quote")
    return { bgMode: "light", background: colors.LIGHT_BG };
  if (type === "problem" || type === "stat")
    return { bgMode: "dark", background: colors.DARK_BG };
  if (preset.bgBias === "mostly-dark") return { bgMode: "dark", background: colors.DARK_BG };
  if (preset.bgBias === "mostly-light") return { bgMode: "light", background: colors.LIGHT_BG };
  return idx % 2 === 0 ? { bgMode: "light", background: colors.LIGHT_BG } : { bgMode: "dark", background: colors.DARK_BG };
}

// src/pages/Result/components/content/carousel/SlideVisual.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
function resolveVisualMode(slide, index) {
  const text = `${slide.imagePrompt || ""} ${slide.headline || ""}`.toLowerCase();
  if (/data|stat|metric|analytic|chart|number|percent|growth rate|roi|revenue|conversion/.test(text)) return "chart";
  if (/network|connect|community|audience|social|people|share|engage|follow|reach/.test(text)) return "flow";
  if (/grow|scale|trend|rise|increase|success|achieve|goal|target|result|launch/.test(text)) return "rise";
  if (/idea|creative|innovate|strategy|tip|secret|hack|transform|power|impact/.test(text)) return "pulse";
  const cycle = ["rise", "chart", "pulse", "flow", "chart", "rise"];
  return cycle[index % cycle.length];
}
function ChartVisual({ p, l, w, h, id }) {
  const padX = 14, padY = 10;
  const drawH = h - padY * 2;
  const baseY = h - padY;
  const fracs = [0.52, 0.74, 0.42, 0.89, 0.61, 0.76, 0.94];
  const barW = Math.round((w - padX * 2) / (fracs.length + 1.4));
  const gap = Math.max(3, Math.round(barW * 0.22));
  const bw = barW - gap;
  const startX = padX + gap;
  const bars = fracs.map((f, i) => ({
    x: startX + i * barW,
    y: baseY - Math.round(drawH * f),
    bh: Math.round(drawH * f),
    accent: i % 3 === 1
  }));
  const pts = bars.map((b) => ({ x: b.x + bw / 2, y: b.y - 3 }));
  const bezier = pts.reduce((d, pt, i) => {
    if (i === 0) return `M${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const cpx = ((prev.x + pt.x) / 2).toFixed(1);
    return `${d} C${cpx},${prev.y.toFixed(1)} ${cpx},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
  }, "");
  const last = pts[pts.length - 1];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("defs", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: `${id}a`, x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "0%", stopColor: p, stopOpacity: "0.82" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "100%", stopColor: p, stopOpacity: "0.10" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: `${id}b`, x1: "0", y1: "0", x2: "0", y2: "1", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "0%", stopColor: l, stopOpacity: "0.65" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "100%", stopColor: l, stopOpacity: "0.08" })
      ] })
    ] }),
    [0.35, 0.68].map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "line",
      {
        x1: startX - 4,
        y1: baseY - drawH * f,
        x2: w - 4,
        y2: baseY - drawH * f,
        stroke: p,
        strokeOpacity: "0.07",
        strokeWidth: "1",
        strokeDasharray: "3 3"
      },
      i
    )),
    bars.map((b, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        x: b.x,
        y: b.y,
        width: bw,
        height: b.bh,
        fill: b.accent ? `url(#${id}b)` : `url(#${id}a)`,
        rx: Math.max(2, bw * 0.14)
      },
      i
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "path",
      {
        d: bezier,
        stroke: l,
        strokeWidth: "1.5",
        fill: "none",
        opacity: "0.7",
        strokeLinecap: "round",
        strokeLinejoin: "round"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: last.x, cy: last.y, r: 7, fill: l, opacity: "0.15" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: last.x, cy: last.y, r: 4, fill: l, opacity: "0.9" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: last.x, cy: last.y, r: 2, fill: "white", opacity: "0.55" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "line",
      {
        x1: startX - 7,
        y1: padY,
        x2: startX - 7,
        y2: baseY,
        stroke: p,
        strokeOpacity: "0.14",
        strokeWidth: "1.5",
        strokeLinecap: "round"
      }
    )
  ] });
}
function FlowVisual({ p, l, w, h }) {
  const ns = [
    { rx: 0.1, ry: 0.25, r: 5, hub: false },
    { rx: 0.3, ry: 0.6, r: 7, hub: false },
    { rx: 0.5, ry: 0.2, r: 4.5, hub: false },
    { rx: 0.67, ry: 0.68, r: 6, hub: false },
    { rx: 0.84, ry: 0.28, r: 8, hub: true },
    { rx: 0.2, ry: 0.84, r: 3.5, hub: false },
    { rx: 0.58, ry: 0.84, r: 4, hub: false },
    { rx: 0.42, ry: 0.44, r: 10.5, hub: true }
  ].map((n) => ({ ...n, x: n.rx * w, y: n.ry * h }));
  const edges = [[0, 2], [0, 1], [1, 3], [2, 4], [3, 4], [1, 5], [5, 6], [6, 3], [2, 7], [7, 3], [7, 1], [7, 4]];
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", height: "100%" }, children: [
    edges.map(([a, b], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "line",
      {
        x1: ns[a].x,
        y1: ns[a].y,
        x2: ns[b].x,
        y2: ns[b].y,
        stroke: p,
        strokeOpacity: "0.13",
        strokeWidth: "1"
      },
      i
    )),
    ns.filter((n) => n.hub).map((n, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: n.x, cy: n.y, r: n.r + 9, fill: p, opacity: "0.07" }, i)),
    ns.map((n, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        cx: n.x,
        cy: n.y,
        r: n.r,
        fill: n.hub ? p : "none",
        stroke: n.hub ? "none" : p,
        strokeOpacity: n.hub ? 0 : 0.32,
        strokeWidth: "1.5",
        opacity: n.hub ? 0.62 : 0.4
      },
      i
    )),
    ns.filter((n) => n.hub).map((n, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: n.x, cy: n.y, r: 2.5, fill: l, opacity: "0.85" }, i))
  ] });
}
function RiseVisual({ p, l, w, h, id }) {
  const pad = 10;
  const x0 = pad, y0 = h - pad;
  const x3 = w - pad, y3 = pad + 4;
  const cx1 = w * 0.28, cy1 = h * 0.88;
  const cx2 = w * 0.68, cy2 = h * 0.1;
  const curve = `M${x0},${y0} C${cx1},${cy1} ${cx2},${cy2} ${x3},${y3}`;
  const area = `${curve} L${x3},${h} L${x0},${h} Z`;
  const milestones = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const u = 1 - t;
    return {
      x: u * u * u * x0 + 3 * u * u * t * cx1 + 3 * u * t * t * cx2 + t * t * t * x3,
      y: u * u * u * y0 + 3 * u * u * t * cy1 + 3 * u * t * t * cy2 + t * t * t * y3,
      last: t === 1
    };
  });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("linearGradient", { id: `${id}r`, x1: "0", y1: "0", x2: "0", y2: "1", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "0%", stopColor: p, stopOpacity: "0.22" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("stop", { offset: "100%", stopColor: p, stopOpacity: "0.01" })
    ] }) }),
    Array.from({ length: 10 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        cx: (i * 37 + 15) % (w - 20) + 10,
        cy: (i * 31 + 18) % (h - 20) + 10,
        r: "1.5",
        fill: p,
        opacity: "0.07"
      },
      i
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: area, fill: `url(#${id}r)` }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "path",
      {
        d: curve,
        stroke: p,
        strokeWidth: "2",
        fill: "none",
        opacity: "0.60",
        strokeLinecap: "round"
      }
    ),
    milestones.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        cx: pt.x,
        cy: pt.y,
        r: pt.last ? 5 : 2.5,
        fill: pt.last ? l : p,
        opacity: pt.last ? 0.95 : 0.45
      },
      i
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "path",
      {
        d: `M${x3 - 8},${y3 - 4} L${x3 + 1},${y3 + 1} L${x3 - 5},${y3 + 9}`,
        stroke: l,
        strokeWidth: "1.5",
        fill: "none",
        strokeLinecap: "round",
        strokeLinejoin: "round",
        opacity: "0.82"
      }
    )
  ] });
}
function PulseVisual({ p, l, w, h }) {
  const cx = w * 0.68, cy = h / 2;
  const R = Math.min(w * 0.44, h * 0.74);
  const N = 10;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", height: "100%" }, children: [
    Array.from({ length: N }, (_, i) => {
      const a = i / N * Math.PI * 2;
      const len = i % 2 === 0 ? R : R * 0.68;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "line",
        {
          x1: cx,
          y1: cy,
          x2: cx + Math.cos(a) * len,
          y2: cy + Math.sin(a) * len,
          stroke: p,
          strokeOpacity: "0.09",
          strokeWidth: "1"
        },
        i
      );
    }),
    [0.3, 0.55, 0.8].map((r, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        cx,
        cy,
        r: R * r,
        fill: "none",
        stroke: p,
        strokeOpacity: 0.09 - i * 0.025,
        strokeWidth: "1"
      },
      i
    )),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx, cy, r: 9, fill: p, opacity: "0.50" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx, cy, r: 4.5, fill: l, opacity: "0.90" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: w * 0.18, cy: h * 0.28, r: 11, fill: p, opacity: "0.11" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: w * 0.32, cy: h * 0.74, r: 7, fill: p, opacity: "0.09" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: w * 0.07, cy: h * 0.68, r: 5, fill: l, opacity: "0.16" }),
    [[0.04, 0.38], [0.16, 0.12], [0.38, 0.9], [0.5, 0.08], [0.9, 0.82], [0.96, 0.22]].map(([rx, ry], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: rx * w, cy: ry * h, r: 1.5, fill: l, opacity: "0.22" }, i))
  ] });
}
function QuoteBgVisual({ p, l, w, h }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: `0 0 ${w} ${h}`, style: { width: "100%", height: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        cx: w * 0.78,
        cy: h * 0.28,
        r: w * 0.46,
        fill: "none",
        stroke: p,
        strokeOpacity: "0.22",
        strokeWidth: "1"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "circle",
      {
        cx: w * 0.78,
        cy: h * 0.28,
        r: w * 0.28,
        fill: "none",
        stroke: p,
        strokeOpacity: "0.14",
        strokeWidth: "1"
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: w * 0.14, cy: h * 0.72, r: w * 0.2, fill: p, opacity: "0.07" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: w * 0.58, cy: h * 0.8, r: 22, fill: l, opacity: "0.06" }),
    Array.from({ length: 5 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "line",
      {
        x1: w * 0.05 + i * w * 0.22,
        y1: 0,
        x2: w * 0.05 + i * w * 0.22 + w * 0.15,
        y2: h,
        stroke: p,
        strokeOpacity: "0.04",
        strokeWidth: "1"
      },
      i
    )),
    [[0.08, 0.15], [0.25, 0.9], [0.5, 0.06], [0.88, 0.93], [0.72, 0.5], [0.35, 0.55]].map(([rx, ry], i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: rx * w, cy: ry * h, r: 2, fill: p, opacity: "0.10" }, i))
  ] });
}
function SlideVisual({
  slide,
  index,
  colors,
  width,
  height,
  variant = "strip"
}) {
  const p = colors.BRAND_PRIMARY;
  const l = colors.BRAND_LIGHT;
  const d = colors.BRAND_DARK;
  const id = `sv${index}`;
  if (variant === "background") {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuoteBgVisual, { p, l, w: width, h: height });
  }
  const props = { p, l, d, w: width, h: height, id };
  const mode = resolveVisualMode(slide, index);
  switch (mode) {
    case "chart":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartVisual, { ...props });
    case "flow":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FlowVisual, { ...props });
    case "rise":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RiseVisual, { ...props });
    case "pulse":
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PulseVisual, { ...props });
  }
}

// src/pages/Result/components/content/carousel/igslide/decorativePrimitives.tsx
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
var IcoZap = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }) });
var IcoTarget = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "6" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "2" })
] });
var IcoShield = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }) });
var IcoRefresh = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "23 4 23 10 17 10" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "1 20 1 14 7 14" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" })
] });
var IcoStar = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" }) });
var IcoTrend = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "17 6 23 6 23 12" })
] });
var IcoCheck = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "22 4 12 14.01 9 11.01" })
] });
var IcoAward = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "8", r: "6" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" })
] });
var IcoMsg = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" }) });
var IcoLayers = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polygon", { points: "12 2 2 7 12 12 22 7 12 2" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "2 17 12 22 22 17" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "2 12 12 17 22 12" })
] });
var IcoArrow = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("polyline", { points: "12 16 16 12 12 8" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "8", y1: "12", x2: "16", y2: "12" })
] });
var IcoChart = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "18", y1: "20", x2: "18", y2: "10" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "6", y1: "20", x2: "6", y2: "14" })
] });
var IcoGlobe = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "12", cy: "12", r: "10" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "2", y1: "12", x2: "22", y2: "12" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })
] });
var IcoLock = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
] });
var IcoSearch = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("circle", { cx: "11", cy: "11", r: "8" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })
] });
var IcoDollar = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "12", y1: "1", x2: "12", y2: "23" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" })
] });
var IcoPhone = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "5", y: "2", width: "14", height: "20", rx: "2", ry: "2" }),
  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("line", { x1: "12", y1: "18", x2: "12.01", y2: "18" })
] });
var IcoBookmark = ({ c }) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: c, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("path", { d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" }) });
var FALLBACK = [IcoZap, IcoTarget, IcoShield, IcoStar, IcoTrend, IcoCheck, IcoAward, IcoMsg];
var EMOJI_MAP = {
  "\u26A1": IcoZap,
  "\u{1F3AF}": IcoTarget,
  "\u{1F6E1}\uFE0F": IcoShield,
  "\u{1F504}": IcoRefresh,
  "\u2B50": IcoStar,
  "\u2728": IcoStar,
  "\u{1F4CA}": IcoChart,
  "\u{1F4C8}": IcoTrend,
  "\u2705": IcoCheck,
  "\u{1F3C6}": IcoAward,
  "\u{1F4AC}": IcoMsg,
  "\u{1F9E9}": IcoLayers,
  "\u{1F680}": IcoArrow,
  "\u{1F310}": IcoGlobe,
  "\u{1F512}": IcoLock,
  "\u{1F511}": IcoLock,
  "\u{1F4CC}": IcoBookmark,
  "\u{1F50D}": IcoSearch,
  "\u{1F4B0}": IcoDollar,
  "\u{1F4F1}": IcoPhone,
  "\u{1F4A1}": IcoStar,
  "\u{1F525}": IcoZap,
  "\u2699\uFE0F": IcoRefresh,
  "\u{1F4DA}": IcoLayers
};
function FeatureIcon({ icon, color, fi }) {
  const t = icon.trim();
  if (/^\d+$/.test(t)) {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { width: 26, height: 26, borderRadius: 8, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: 11, fontWeight: 800, color, fontFamily: FONT }, children: t }) });
  }
  const Ico = EMOJI_MAP[t] ?? FALLBACK[fi % FALLBACK.length];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { width: 26, height: 26, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Ico, { c: color }) });
}
function DotGrid({ color, opacity = 0.055 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      style: { position: "absolute", inset: 0, pointerEvents: "none", opacity },
      dangerouslySetInnerHTML: { __html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="dg" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.5" fill="${color}"/></pattern></defs><rect width="100%" height="100%" fill="url(#dg)"/></svg>` }
    }
  );
}
function GridLines({ color }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      style: { position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.04 },
      dangerouslySetInnerHTML: { __html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="gl" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M 36 0 L 0 0 0 36" fill="none" stroke="${color}" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#gl)"/></svg>` }
    }
  );
}
function CrosshatchLines({ color }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      style: { position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.032 },
      dangerouslySetInnerHTML: { __html: `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="ch" width="24" height="24" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="24" y2="24" stroke="${color}" stroke-width="1"/><line x1="24" y1="0" x2="0" y2="24" stroke="${color}" stroke-width="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#ch)"/></svg>` }
    }
  );
}
function GlowBlob({ color, x = "75%", y = "18%", size = 200, opacity = 0.16 }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", left: x, top: y, transform: "translate(-50%,-50%)", width: size, height: size, borderRadius: "50%", background: color, filter: "blur(64px)", opacity, pointerEvents: "none" } });
}
function CornerRings({ colors }) {
  const c = colors.BRAND_PRIMARY;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { position: "absolute", top: 0, right: 0, width: 160, height: 160, overflow: "hidden", pointerEvents: "none" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", top: -72, right: -72, width: 160, height: 160, borderRadius: "50%", border: `1.5px solid ${c}`, opacity: 0.07 } }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", top: -44, right: -44, width: 100, height: 100, borderRadius: "50%", background: c, opacity: 0.07 } }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", top: -16, right: -16, width: 58, height: 58, borderRadius: "50%", border: `1.5px solid ${c}`, opacity: 0.14 } }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", top: 14, right: 14, width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.3 } })
  ] });
}
function BottomCornerRings({ colors }) {
  const c = colors.BRAND_PRIMARY;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { position: "absolute", bottom: PROGRESS_H, left: 0, width: 130, height: 130, overflow: "hidden", pointerEvents: "none" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", bottom: -60, left: -60, width: 130, height: 130, borderRadius: "50%", border: `1.5px solid ${c}`, opacity: 0.08 } }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", bottom: -36, left: -36, width: 80, height: 80, borderRadius: "50%", background: c, opacity: 0.06 } }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", bottom: -10, left: -10, width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${c}`, opacity: 0.12 } })
  ] });
}
function DiamondAccent({ color }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { position: "absolute", bottom: PROGRESS_H + 14, left: -18, pointerEvents: "none", opacity: 0.1 }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("svg", { width: "60", height: "60", viewBox: "0 0 60 60", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "15", y: "15", width: "30", height: "30", fill: "none", stroke: color, strokeWidth: "1.5", transform: "rotate(45 30 30)" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("rect", { x: "22", y: "22", width: "16", height: "16", fill: color, opacity: "0.5", transform: "rotate(45 30 30)" })
  ] }) });
}
function LeftStripe({ color, accent = false }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: {
    position: "absolute",
    left: 0,
    top: 20,
    bottom: PROGRESS_H + 20,
    width: 3,
    borderRadius: "0 2px 2px 0",
    background: accent ? `linear-gradient(to bottom, ${color}, ${color}60, transparent)` : color
  } });
}
function RadialBurst({ color }) {
  const N = 18, cx = 210, cy = 262;
  const lines = Array.from({ length: N }, (_, i) => {
    const a = i / N * Math.PI * 2;
    return `<line x1="${cx}" y1="${cy}" x2="${(cx + 380 * Math.cos(a)).toFixed(1)}" y2="${(cy + 380 * Math.sin(a)).toFixed(1)}" stroke="${color}" stroke-width="0.7" stroke-opacity="0.07"/>`;
  }).join("");
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      style: { position: "absolute", inset: 0, pointerEvents: "none" },
      dangerouslySetInnerHTML: { __html: `<svg width="420" height="525" xmlns="http://www.w3.org/2000/svg">${lines}</svg>` }
    }
  );
}
function StatWatermark({ text, color }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: {
    position: "absolute",
    right: -12,
    top: 30,
    fontSize: 180,
    fontWeight: 900,
    lineHeight: 0.85,
    color,
    opacity: 0.05,
    fontFamily: FONT,
    letterSpacing: -8,
    pointerEvents: "none",
    userSelect: "none"
  }, children: text });
}
function DiagStripes({ color }) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      style: { position: "absolute", bottom: PROGRESS_H, right: 0, width: 130, height: 130, overflow: "hidden", pointerEvents: "none", opacity: 0.06 },
      dangerouslySetInnerHTML: { __html: `<svg width="130" height="130" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="ds" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="${color}" stroke-width="4"/></pattern></defs><rect width="130" height="130" fill="url(#ds)"/></svg>` }
    }
  );
}

// src/pages/Result/components/content/carousel/igslide/contentPieces.tsx
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
function PillTag({ text, bgMode, colors }) {
  const styles = {
    light: { bg: colors.BRAND_PRIMARY + "14", border: colors.BRAND_PRIMARY + "30", color: colors.BRAND_PRIMARY },
    dark: { bg: colors.BRAND_LIGHT + "18", border: colors.BRAND_LIGHT + "35", color: colors.BRAND_LIGHT },
    accent: { bg: "rgba(255,255,255,0.12)", border: "rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.75)" }
  };
  const s = styles[bgMode];
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, background: s.bg, border: `1px solid ${s.border}`, fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", fontFamily: FONT, color: s.color }, children: text });
}
function StrikethroughPill({ text }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: {
    fontSize: 11,
    padding: "5px 12px",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#6B6570",
    textDecoration: "line-through",
    fontFamily: FONT
  }, children: text });
}
function PromptBox({ label, text }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: {
    padding: "14px 16px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.1)"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: { margin: "0 0 7px", fontSize: 9, color: "rgba(255,255,255,0.45)", fontFamily: FONT, letterSpacing: 1.5, textTransform: "uppercase" }, children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { style: { margin: 0, fontSize: 14, color: "rgba(255,255,255,0.92)", fontStyle: "italic", lineHeight: 1.45, fontFamily: FONT }, children: [
      '"',
      text,
      '"'
    ] })
  ] });
}
function InitialsCircle({ name, size = 36, colors }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { width: size, height: size, borderRadius: "50%", background: `linear-gradient(135deg, ${colors.BRAND_PRIMARY}, ${colors.BRAND_DARK})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.42), fontFamily: FONT }, children: (name || "B").trim()[0].toUpperCase() }) });
}
function BrandLockup({ brandName, handle, bgMode, colors }) {
  if (!brandName) return null;
  const tc = bgMode === "light" ? colors.BRAND_DARK : "#fff";
  const sc = bgMode === "light" ? colors.BRAND_DARK + "88" : "rgba(255,255,255,0.45)";
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(InitialsCircle, { name: brandName, colors }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 12, fontWeight: 700, color: tc, fontFamily: FONT, letterSpacing: 0.2 }, children: brandName }),
      handle && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 10, color: sc, fontFamily: FONT }, children: handle })
    ] })
  ] });
}
function FeatureRow({ point, colors, isLight, isLast, fi }) {
  const borderColor = isLight ? colors.LIGHT_BORDER : "rgba(255,255,255,0.07)";
  const labelColor = isLight ? colors.BRAND_DARK : "rgba(255,255,255,0.9)";
  const descColor = isLight ? "#8A8580" : "rgba(255,255,255,0.45)";
  const iconColor = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: "10px 0",
    borderBottom: isLast ? "none" : `1px solid ${borderColor}`,
    flexShrink: 0
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FeatureIcon, { icon: point.icon, color: iconColor, fi }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 13, fontWeight: 600, color: labelColor, fontFamily: FONT, lineHeight: 1.3 }, children: point.label }),
      point.desc && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 11, color: descColor, fontFamily: FONT, lineHeight: 1.4, marginTop: 2 }, children: point.desc })
    ] })
  ] });
}
function FeatureCard({ point, colors, isLight, isLast, fi }) {
  const cardBg = isLight ? colors.BRAND_PRIMARY + "10" : "rgba(255,255,255,0.05)";
  const cardBorder = isLight ? colors.BRAND_PRIMARY + "22" : "rgba(255,255,255,0.08)";
  const labelColor = isLight ? colors.BRAND_DARK : "#fff";
  const descColor = isLight ? colors.BRAND_DARK + "AA" : "rgba(255,255,255,0.46)";
  const iconColor = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "7px 9px",
    borderRadius: 8,
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    marginBottom: isLast ? 0 : 6,
    flexShrink: 0
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(FeatureIcon, { icon: point.icon, color: iconColor, fi }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 11, fontWeight: 700, color: labelColor, fontFamily: FONT, lineHeight: 1.3, marginBottom: 1 }, children: point.label }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: {
        fontSize: 10,
        color: descColor,
        fontFamily: FONT,
        lineHeight: 1.4,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical"
      }, children: point.desc })
    ] })
  ] });
}
function NumberedStep({ point, stepNum, colors, isLight, isLast }) {
  const borderColor = isLight ? colors.LIGHT_BORDER : "rgba(255,255,255,0.07)";
  const labelColor = isLight ? colors.BRAND_DARK : "rgba(255,255,255,0.9)";
  const descColor = isLight ? "#8A8580" : "rgba(255,255,255,0.45)";
  const numColor = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    padding: "11px 0",
    borderBottom: isLast ? "none" : `1px solid ${borderColor}`,
    flexShrink: 0
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: {
      fontSize: 24,
      fontWeight: 300,
      color: numColor,
      fontFamily: "var(--font-heading)",
      minWidth: 32,
      lineHeight: 1
    }, children: String(stepNum).padStart(2, "0") }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, minWidth: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 13, fontWeight: 600, color: labelColor, fontFamily: FONT, lineHeight: 1.3 }, children: point.label }),
      point.desc && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { fontSize: 11, color: descColor, fontFamily: FONT, lineHeight: 1.4, marginTop: 2 }, children: point.desc })
    ] })
  ] });
}

// src/pages/Result/components/content/carousel/igslide/layouts/CoverLayout.tsx
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
function CoverLayoutA({ slide, colors, brandName, handle }) {
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { position: "absolute", bottom: BOTTOM_PAD, left: 0, right: 0, height: 100, overflow: "hidden", opacity: 0.72 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(SlideVisual, { slide, index: 0, colors, width: 420, height: 100, variant: "strip" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: {
        position: "absolute",
        inset: 0,
        background: `linear-gradient(to bottom, ${colors.LIGHT_BG} 0%, transparent 28%, transparent 72%, ${colors.LIGHT_BG} 100%)`,
        pointerEvents: "none"
      } })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.05 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DiagStripes, { color: colors.BRAND_PRIMARY }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CornerRings, { colors }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DiamondAccent, { color: colors.BRAND_PRIMARY }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BrandLockup, { brandName, handle, bgMode: "light", colors }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { height: 1, background: colors.BRAND_PRIMARY, opacity: 0.25, margin: "18px 0 20px" } }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PillTag, { text: "FEATURED", bgMode: "light", colors }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { height: 14 } }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { style: { margin: "0 0 12px", fontSize: 32, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.7, color: colors.BRAND_DARK, fontFamily: FONT }, children: slide.headline }),
    slide.body && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: { margin: "0 0 18px", fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + "AA", fontFamily: FONT }, children: slide.body }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: 4 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { width: 28, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2 } }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { width: 10, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.35 } }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { width: 5, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.15 } })
    ] })
  ] });
}
function CoverLayoutB({ slide, colors, brandName, handle }) {
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `20px ${rp}px ${BOTTOM_PAD}px ${pad}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(RadialBurst, { color: colors.BRAND_PRIMARY }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(GlowBlob, { color: colors.BRAND_PRIMARY, x: "50%", y: "38%", size: 260, opacity: 0.09 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.04 }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(PillTag, { text: "START HERE", bgMode: "light", colors }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: 10, fontWeight: 700, color: colors.BRAND_DARK + "60", fontFamily: FONT, letterSpacing: 1 }, children: "01" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(InitialsCircle, { name: brandName, size: 72, colors }) }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { flexShrink: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: 4, marginBottom: 14 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { width: 28, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2 } }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { width: 10, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.35 } }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { width: 5, height: 3, background: colors.BRAND_PRIMARY, borderRadius: 2, opacity: 0.15 } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { style: { margin: "0 0 10px", fontSize: 30, fontWeight: 800, lineHeight: 1.08, letterSpacing: -0.6, color: colors.BRAND_DARK, fontFamily: FONT }, children: slide.headline }),
      slide.body && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: { margin: "0 0 14px", fontSize: 12, lineHeight: 1.55, color: colors.BRAND_DARK + "AA", fontFamily: FONT }, children: slide.body }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(BrandLockup, { brandName, handle, bgMode: "light", colors })
    ] })
  ] });
}
function CoverLayout({ slide, index, colors, brandName, handle, preset }) {
  if (preset.cover === 1 && brandName) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CoverLayoutB, { slide, index, colors, brandName, handle });
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CoverLayoutA, { slide, index, colors, brandName, handle });
}

// src/pages/Result/components/content/carousel/igslide/types.ts
function stablePointKeys(points) {
  const seen = /* @__PURE__ */ new Map();
  return points.map((pt) => {
    const base = `${pt.label}::${pt.desc}`;
    const occurrence = seen.get(base) ?? 0;
    seen.set(base, occurrence + 1);
    return `${base}#${occurrence}`;
  });
}

// src/pages/Result/components/content/carousel/igslide/layouts/ContentLayout.tsx
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
var CONTENT_PILL_LABELS = ["KEY POINTS", "INSIGHTS", "BREAKDOWN", "DEEP DIVE", "TAKEAWAY", "OVERVIEW"];
function ContentLayoutA({ slide, index, colors, bgMode }) {
  const isLight = bgMode === "light";
  const headColor = isLight ? colors.BRAND_DARK : "#fff";
  const bodyColor = isLight ? colors.BRAND_DARK + "AA" : "rgba(255,255,255,0.56)";
  const numColor = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  const divColor = isLight ? colors.BRAND_PRIMARY + "22" : "rgba(255,255,255,0.07)";
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points) : [];
  const pillLabel = CONTENT_PILL_LABELS[index % CONTENT_PILL_LABELS.length];
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: "relative" }, children: [
    isLight ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.042 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(GridLines, { color: colors.BRAND_PRIMARY }),
    !isLight && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(GlowBlob, { color: colors.BRAND_PRIMARY, x: GLOW_PRESETS[index % GLOW_PRESETS.length].x, y: GLOW_PRESETS[index % GLOW_PRESETS.length].y, size: GLOW_PRESETS[index % GLOW_PRESETS.length].size, opacity: 0.13 }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(LeftStripe, { color: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT, accent: true }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: hasPoints ? 10 : 14, flexShrink: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { fontSize: 11, fontWeight: 800, color: numColor, fontFamily: FONT, letterSpacing: 0.5, opacity: 0.7 }, children: String(index + 1).padStart(2, "0") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PillTag, { text: pillLabel, bgMode: isLight ? "light" : "dark", colors })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", justifyContent: hasPoints ? "flex-start" : "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { style: { margin: hasPoints ? "0 0 8px" : "0 0 10px", fontSize: hasPoints ? 20 : 24, fontWeight: 700, lineHeight: 1.14, letterSpacing: -0.3, color: headColor, fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { margin: hasPoints ? "0 0 10px" : "0", fontSize: 13, lineHeight: 1.55, color: bodyColor, fontFamily: FONT, flexShrink: 0 }, children: slide.body }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { height: 1, background: divColor, marginBottom: 4, flexShrink: 0 } }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", flex: 1, minHeight: 0 }, children: slide.points.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FeatureCard, { fi: i, point: pt, colors, isLight, isLast: i === slide.points.length - 1 }, pointKeys[i])) }),
      !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { marginTop: 20, flexShrink: 0 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { borderRadius: 8, overflow: "hidden", height: 90, marginBottom: 10, border: `1px solid ${isLight ? colors.BRAND_PRIMARY + "18" : "rgba(255,255,255,0.07)"}`, opacity: 0.78 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SlideVisual, { slide, index, colors, width: 360, height: 90, variant: "block" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { height: 1, background: divColor, marginBottom: 12 } }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", gap: 4 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { width: 20, height: 2, background: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT, borderRadius: 1 } }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { width: 8, height: 2, background: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT, borderRadius: 1, opacity: 0.35 } })
        ] })
      ] })
    ] })
  ] });
}
function ContentLayoutB({ slide, index, colors, bgMode }) {
  const isLight = bgMode === "light";
  const headColor = isLight ? colors.BRAND_DARK : "#fff";
  const bodyColor = isLight ? colors.BRAND_DARK + "AA" : "rgba(255,255,255,0.56)";
  const accent = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  const divColor = isLight ? colors.BRAND_PRIMARY + "22" : "rgba(255,255,255,0.07)";
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points) : [];
  const glowP = GLOW_PRESETS[(index + 1) % GLOW_PRESETS.length];
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: {
      height: 46,
      padding: `0 ${Math.max(H_PAD, 50)}px 0 ${H_PAD}px`,
      background: accent + (isLight ? "14" : "1C"),
      borderBottom: `1px solid ${accent}${isLight ? "20" : "18"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexShrink: 0
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PillTag, { text: hasPoints ? "BREAKDOWN" : "KEY INSIGHT", bgMode: isLight ? "light" : "dark", colors }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { fontSize: 11, fontWeight: 800, color: accent, fontFamily: FONT, opacity: 0.62, letterSpacing: 0.5 }, children: String(index + 1).padStart(2, "0") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(StatWatermark, { text: String(index + 1), color: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT }),
    isLight ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.032 }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(CrosshatchLines, { color: colors.BRAND_PRIMARY }),
    !isLight && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(GlowBlob, { color: colors.BRAND_PRIMARY, x: glowP.x, y: glowP.y, size: glowP.size, opacity: 0.12 }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `16px ${Math.max(H_PAD, 50)}px ${BOTTOM_PAD}px ${H_PAD}px`, justifyContent: hasPoints ? "flex-start" : "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { style: { margin: hasPoints ? "0 0 10px" : "0 0 12px", fontSize: hasPoints ? 22 : 26, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5, color: headColor, fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { margin: "0 0 14px", fontSize: 13, lineHeight: 1.6, color: bodyColor, fontFamily: FONT, flexShrink: 0 }, children: slide.body }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { height: 1, background: divColor, marginBottom: 8, flexShrink: 0 } }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minHeight: 0, overflow: "hidden" }, children: slide.points.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FeatureCard, { fi: i, point: pt, colors, isLight, isLast: i === slide.points.length - 1 }, pointKeys[i])) }),
      !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginTop: 20, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { borderRadius: 8, overflow: "hidden", height: 88, border: `1px solid ${isLight ? colors.BRAND_PRIMARY + "18" : "rgba(255,255,255,0.07)"}`, opacity: 0.78 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SlideVisual, { slide, index, colors, width: 360, height: 88, variant: "block" }) }) })
    ] })
  ] });
}
function ContentLayoutC({ slide, index, colors, bgMode }) {
  const isLight = bgMode === "light";
  const headColor = isLight ? colors.BRAND_DARK : "#fff";
  const bodyColor = isLight ? colors.BRAND_DARK + "AA" : "rgba(255,255,255,0.56)";
  const accent = isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT;
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points) : [];
  const cardBg = isLight ? "rgba(255,255,255,0.68)" : "rgba(255,255,255,0.05)";
  const cardBorder = isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.09)";
  const glowP = GLOW_PRESETS[(index + 2) % GLOW_PRESETS.length];
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `14px ${H_PAD}px ${BOTTOM_PAD}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DiagStripes, { color: isLight ? colors.BRAND_PRIMARY : colors.BRAND_LIGHT }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(CornerRings, { colors }),
    !isLight && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(GlowBlob, { color: colors.BRAND_PRIMARY, x: glowP.x, y: glowP.y, size: glowP.size, opacity: 0.11 }),
    isLight && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.036 }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { fontSize: 11, fontWeight: 800, color: accent, fontFamily: FONT, opacity: 0.62, letterSpacing: 0.5 }, children: String(index + 1).padStart(2, "0") }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(PillTag, { text: hasPoints ? "DEEP DIVE" : "TAKEAWAY", bgMode: isLight ? "light" : "dark", colors })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 14,
      padding: "14px 14px 10px",
      justifyContent: hasPoints ? "flex-start" : "center"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { width: 32, height: 3, background: accent, borderRadius: 2, marginBottom: 10, flexShrink: 0 } }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h2", { style: { margin: hasPoints ? "0 0 10px" : "0 0 12px", fontSize: hasPoints ? 20 : 23, fontWeight: 700, lineHeight: 1.15, letterSpacing: -0.3, color: headColor, fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { margin: 0, fontSize: 13, lineHeight: 1.55, color: bodyColor, fontFamily: FONT, flexShrink: 0 }, children: slide.body }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minHeight: 0, overflow: "hidden" }, children: slide.points.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(FeatureCard, { fi: i, point: pt, colors, isLight, isLast: i === slide.points.length - 1 }, pointKeys[i])) }),
      !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { marginTop: 20, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { borderRadius: 6, overflow: "hidden", height: 72, border: `1px solid ${isLight ? colors.BRAND_PRIMARY + "14" : "rgba(255,255,255,0.06)"}`, opacity: 0.72 }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(SlideVisual, { slide, index, colors, width: 340, height: 72, variant: "block" }) }) })
    ] })
  ] });
}
function ContentLayout({ slide, index, colors, bgMode, preset }) {
  const v = preset.contentForce !== null ? preset.contentForce : (index + preset.contentStart) % 3;
  if (v === 1) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ContentLayoutB, { slide, index, colors, bgMode });
  if (v === 2) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ContentLayoutC, { slide, index, colors, bgMode });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ContentLayoutA, { slide, index, colors, bgMode });
}

// src/pages/Result/components/content/carousel/igslide/layouts/StatLayout.tsx
var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
function StatLayout({ slide, colors }) {
  const match = (slide.headline || "").match(/^(\$?[\d,.]+[KMBx%+×]*(?:\s*[×xX]\s*\d+)?)/);
  const stat = match ? match[1].trim() : "";
  const rest = match ? slide.headline.slice(match[0].length).trim() : slide.headline || "";
  const pad = H_PAD;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", padding: `24px ${Math.max(pad, 50)}px ${BOTTOM_PAD}px ${pad + 10}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(GridLines, { color: colors.BRAND_PRIMARY }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(GlowBlob, { color: colors.BRAND_PRIMARY, x: "20%", y: "55%", size: 220, opacity: 0.14 }),
    stat && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StatWatermark, { text: stat, color: colors.BRAND_LIGHT }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(LeftStripe, { color: colors.BRAND_LIGHT }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PillTag, { text: "DATA POINT", bgMode: "dark", colors }) }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { height: 22 } }),
    stat && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: 72, fontWeight: 900, lineHeight: 0.9, color: colors.BRAND_LIGHT, fontFamily: FONT, letterSpacing: -3, marginBottom: 10, flexShrink: 0 }, children: stat }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", gap: 4, marginBottom: 12, flexShrink: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { width: 28, height: 2, background: colors.BRAND_PRIMARY, borderRadius: 1 } }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { width: 12, height: 2, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.4 } })
    ] }),
    rest && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h2", { style: { margin: "0 0 10px", fontSize: 20, fontWeight: 700, lineHeight: 1.22, letterSpacing: -0.2, color: "#fff", fontFamily: FONT, flexShrink: 0 }, children: rest }),
    slide.body && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.52)", fontFamily: FONT, flexShrink: 0 }, children: slide.body })
  ] });
}

// src/pages/Result/components/content/carousel/igslide/layouts/QuoteLayout.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
function QuoteLayoutA({ slide, index, colors }) {
  const pad = H_PAD;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", padding: `24px ${Math.max(pad, 50)}px ${BOTTOM_PAD}px ${pad + 10}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { position: "absolute", inset: 0, opacity: 0.12, pointerEvents: "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SlideVisual, { slide, index, colors, width: 420, height: 525, variant: "background" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.048 }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(CornerRings, { colors }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(LeftStripe, { color: colors.BRAND_PRIMARY }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PillTag, { text: "INSIGHT", bgMode: "light", colors }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { height: 18 } }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { fontFamily: "Georgia,serif", fontSize: 84, lineHeight: 0.75, color: colors.BRAND_PRIMARY, opacity: 0.3, marginBottom: 10, flexShrink: 0, letterSpacing: -4 }, children: '"' }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { style: { margin: "0 0 16px", fontSize: 22, fontWeight: 700, lineHeight: 1.24, letterSpacing: -0.25, color: colors.BRAND_DARK, fontStyle: "italic", fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
    slide.body && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexShrink: 0 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { width: 20, height: 1.5, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.5 } }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { width: 4, height: 4, borderRadius: "50%", background: colors.BRAND_PRIMARY, opacity: 0.5 } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + "AA", fontFamily: FONT, flexShrink: 0 }, children: slide.body })
    ] })
  ] });
}
function QuoteLayoutB({ slide, index, colors }) {
  const pad = H_PAD;
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: `24px ${Math.max(pad, 50)}px ${BOTTOM_PAD}px ${pad}px`,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center"
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { position: "absolute", inset: 0, opacity: 0.1, pointerEvents: "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SlideVisual, { slide, index, colors, width: 420, height: 525, variant: "background" }) }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.04 }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(GlowBlob, { color: colors.BRAND_PRIMARY, x: "50%", y: "40%", size: 240, opacity: 0.1 }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(BottomCornerRings, { colors }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PillTag, { text: "QUOTE", bgMode: "light", colors }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { height: 20 } }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: {
        width: 54,
        height: 54,
        borderRadius: "50%",
        background: colors.BRAND_PRIMARY + "18",
        border: `1.5px solid ${colors.BRAND_PRIMARY}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 18,
        flexShrink: 0
      }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: { fontFamily: "Georgia,serif", fontSize: 30, lineHeight: 1, color: colors.BRAND_PRIMARY, marginTop: -4 }, children: '"' }) }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h2", { style: { margin: "0 0 16px", fontSize: 21, fontWeight: 700, lineHeight: 1.25, letterSpacing: -0.25, color: colors.BRAND_DARK, fontStyle: "italic", fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(import_jsx_runtime7.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 10, flexShrink: 0 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { width: 20, height: 1.5, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.4 } }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { width: 4, height: 4, borderRadius: "50%", background: colors.BRAND_PRIMARY, opacity: 0.4 } }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { width: 20, height: 1.5, background: colors.BRAND_PRIMARY, borderRadius: 1, opacity: 0.4 } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("p", { style: { margin: 0, fontSize: 12.5, lineHeight: 1.6, color: colors.BRAND_DARK + "AA", fontFamily: FONT, flexShrink: 0 }, children: slide.body })
      ] })
    ] })
  ] });
}
function QuoteLayout({ slide, index, colors }) {
  const v = index % 2;
  if (v === 1) return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(QuoteLayoutB, { slide, index, colors });
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(QuoteLayoutA, { slide, index, colors });
}

// src/pages/Result/components/content/carousel/igslide/layouts/CTALayout.tsx
var import_jsx_runtime8 = __toESM(require_jsx_runtime(), 1);
function CTALayout({ slide, colors, brandName, handle }) {
  const ctaAction = slide.cta?.action || "Follow for more";
  const ctaHandle = slide.cta?.handle || handle;
  const pad = H_PAD;
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", overflow: "hidden", padding: `${pad}px ${pad}px ${BOTTOM_PAD}px ${pad}px`, textAlign: "center", position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(RadialBurst, { color: "#fff" }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.05)", filter: "blur(60px)", pointerEvents: "none" } }),
    brandName && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { position: "relative", marginBottom: 18 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { position: "absolute", inset: -10, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.22)", boxShadow: "0 0 24px rgba(255,255,255,0.1)" } }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(InitialsCircle, { name: brandName, size: 48, colors })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(PillTag, { text: "FOLLOW FOR MORE", bgMode: "accent", colors }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { height: 12 } }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h2", { style: { margin: "0 0 12px", fontSize: 24, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5, color: "#fff", fontFamily: FONT }, children: slide.headline }),
    slide.body && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { style: { margin: "0 0 22px", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.62)", fontFamily: FONT }, children: slide.body }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 30, background: "rgba(255,255,255,0.96)", color: colors.BRAND_DARK, fontFamily: FONT, fontWeight: 700, fontSize: 13 }, children: [
      ctaAction,
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("polyline", { points: "9 18 15 12 9 6" }) })
    ] }),
    ctaHandle && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { marginTop: 12, fontSize: 10.5, color: "rgba(255,255,255,0.38)", fontFamily: FONT, letterSpacing: 0.5 }, children: ctaHandle })
  ] });
}

// src/pages/Result/components/content/carousel/igslide/layouts/ProblemLayout.tsx
var import_jsx_runtime9 = __toESM(require_jsx_runtime(), 1);
function ProblemLayout({ slide, colors }) {
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points) : [];
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(GridLines, { color: colors.BRAND_PRIMARY }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(GlowBlob, { color: "#FF4444", x: "80%", y: "15%", size: 200, opacity: 0.08 }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(LeftStripe, { color: colors.BRAND_LIGHT }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(PillTag, { text: "THE PROBLEM", bgMode: "dark", colors }) }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", justifyContent: hasPoints ? "flex-start" : "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h2", { style: { margin: "20px 0 12px", fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5, color: "#fff", fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { style: { margin: "0 0 20px", fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.52)", fontFamily: FONT, flexShrink: 0 }, children: slide.body }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, flexShrink: 0 }, children: slide.points.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(StrikethroughPill, { text: pt.label }, pointKeys[i])) })
    ] })
  ] });
}

// src/pages/Result/components/content/carousel/igslide/layouts/SolutionLayout.tsx
var import_jsx_runtime10 = __toESM(require_jsx_runtime(), 1);
function SolutionLayout({ slide, colors, brandName, handle }) {
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(DotGrid, { color: "rgba(255,255,255,1)", opacity: 0.04 }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(CornerRings, { colors }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { position: "absolute", top: "60%", left: "50%", transform: "translate(-50%,-50%)", width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", filter: "blur(60px)", pointerEvents: "none" } }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PillTag, { text: "THE SOLUTION", bgMode: "accent", colors }) }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", justifyContent: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h2", { style: { margin: "0 0 18px", fontSize: 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.5, color: "#fff", fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PromptBox, { label: "How it works", text: slide.body })
    ] }),
    brandName && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { paddingTop: 18, flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(BrandLockup, { brandName, handle, bgMode: "accent", colors }) })
  ] });
}

// src/pages/Result/components/content/carousel/igslide/layouts/HowToLayout.tsx
var import_jsx_runtime11 = __toESM(require_jsx_runtime(), 1);
function HowToLayout({ slide, colors }) {
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points) : [];
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.042 }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(CornerRings, { colors }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(LeftStripe, { color: colors.BRAND_PRIMARY, accent: true }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(PillTag, { text: "HOW IT WORKS", bgMode: "light", colors }) }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", justifyContent: hasPoints ? "flex-start" : "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h2", { style: { margin: hasPoints ? "14px 0 6px" : "0 0 6px", fontSize: hasPoints ? 20 : 26, fontWeight: 700, lineHeight: 1.14, letterSpacing: -0.3, color: colors.BRAND_DARK, fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { style: { margin: "0 0 16px", fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + "AA", fontFamily: FONT, flexShrink: 0 }, children: slide.body }),
      hasPoints && // WHY justifyContent: center — a short points list (e.g. 3-4 rows) in a tall
      // box otherwise packs to the top and leaves empty space below; centering keeps
      // it looking intentional whether there are 2 rows or enough to fill the box.
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden", flex: 1, minHeight: 0 }, children: slide.points.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(NumberedStep, { point: pt, stepNum: i + 1, colors, isLight: true, isLast: i === slide.points.length - 1 }, pointKeys[i])) })
    ] })
  ] });
}

// src/pages/Result/components/content/carousel/igslide/layouts/FeaturesLayout.tsx
var import_jsx_runtime12 = __toESM(require_jsx_runtime(), 1);
function FeaturesLayout({ slide, colors }) {
  const hasPoints = Array.isArray(slide.points) && slide.points.length > 0;
  const pointKeys = hasPoints ? stablePointKeys(slide.points) : [];
  const pad = H_PAD;
  const rp = Math.max(pad, 50);
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", padding: `24px ${rp}px ${BOTTOM_PAD}px ${pad + 10}px`, position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(DotGrid, { color: colors.BRAND_PRIMARY, opacity: 0.042 }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(LeftStripe, { color: colors.BRAND_PRIMARY, accent: true }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { flexShrink: 0 }, children: /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(PillTag, { text: "WHAT YOU GET", bgMode: "light", colors }) }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", justifyContent: hasPoints ? "flex-start" : "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h2", { style: { margin: hasPoints ? "12px 0 4px" : "0 0 4px", fontSize: hasPoints ? 20 : 26, fontWeight: 700, lineHeight: 1.14, letterSpacing: -0.3, color: colors.BRAND_DARK, fontFamily: FONT, flexShrink: 0 }, children: slide.headline }),
      slide.body && !hasPoints && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { style: { margin: 0, fontSize: 13, lineHeight: 1.6, color: colors.BRAND_DARK + "AA", fontFamily: FONT, flexShrink: 0 }, children: slide.body }),
      hasPoints && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { marginTop: 8, display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, minHeight: 0, overflow: "hidden" }, children: slide.points.map((pt, i) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(FeatureRow, { fi: i, point: pt, colors, isLight: true, isLast: i === slide.points.length - 1 }, pointKeys[i])) })
    ] })
  ] });
}

// src/pages/Result/components/content/carousel/IGSlide.tsx
var import_jsx_runtime13 = __toESM(require_jsx_runtime(), 1);
var IGSlide = import_react.default.forwardRef(
  // NOTE: isLast stays in IGSlideProps (callers pass it) but is no longer consumed here —
  // it only ever fed the now-removed SwipeArrow.
  function IGSlide2({ slide, index, total, colors, brandName, handle, width = 420, height = 525, designPreset = 0 }, ref) {
    const preset = DESIGN_PRESETS[Math.abs(designPreset) % DESIGN_PRESETS.length];
    const type = resolveType(slide, index, total);
    const { bgMode, background } = resolveBackground(slide, index, total, preset, colors);
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
      "div",
      {
        ref,
        style: { position: "relative", width, height, flexShrink: 0, background, overflow: "hidden", display: "flex", flexDirection: "column" },
        children: [
          type === "cover" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(CoverLayout, { slide, index, colors, brandName, handle, preset }),
          type === "problem" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ProblemLayout, { slide, colors }),
          type === "solution" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(SolutionLayout, { slide, colors, brandName, handle }),
          type === "howto" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(HowToLayout, { slide, colors }),
          type === "features" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(FeaturesLayout, { slide, colors }),
          (type === "content" || type === "tip" || type === "details") && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ContentLayout, { slide, index, colors, bgMode: bgMode === "light" ? "light" : "dark", preset }),
          type === "stat" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(StatLayout, { slide, colors }),
          type === "quote" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(QuoteLayout, { slide, index, colors }),
          type === "cta" && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(CTALayout, { slide, colors, brandName, handle }),
          !["cover", "problem", "solution", "howto", "features", "content", "tip", "details", "stat", "quote", "cta"].includes(type) && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(ContentLayout, { slide, index, colors, bgMode: bgMode === "light" ? "light" : "dark", preset })
        ]
      }
    );
  }
);

// src/ssr/fonts/PlusJakartaSans-latin.woff2
var PlusJakartaSans_latin_default = "data:font/woff2;base64,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";

// src/ssr/fonts/PlusJakartaSans-italic-latin.woff2
var PlusJakartaSans_italic_latin_default = "data:font/woff2;base64,d09GMgABAAAAAHOgABQAAAAA+VgAAHMqAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGoQdG816HIgyP0hWQVKHXz9NVkFSRgZgP1NUQVSBGACFNC9cEQgKgZI48ysLhDwAMIHRQgE2AiQDiHQEIAWIMAeKIQwHGzDmJWxjYH7pzSp+nnwNCTaZbi6eu1WII4DZTKQpIQXL/v+MpEPGBq8NgGtauUAKNJEZTkVEc3ahbKIjsNlVAeVxRJ2iGe7jUwd7Hy0oZaKNmIo211Skfyc2rQpDKzrixrR0lrwb9BJ0WXIIWhJfTWbQoXfPOLwgZJkAwxEXCj9zzvqUm+brBDboxPul+VteL3ssPYKvue4T/BGypCENA1r460Eo+LTLXiuzCHCb+BEJOb748/zc/tz7antL3sbYxhi9DenRaYMVgAhYYIJBlIXRhVHo92Oh/jQS/xdEflATDET7EUF29F89s7h75AeQWYhghGIoMtvh+en8P4OyJg2tU03SqN+YXMmN3Nyo1oWKAYMi20N8woO5YJM/9jdgZlCmCkyMNza/15bxVZW4JHX3AK+XPzBGFwJH2Q18SMKL7uWYA+KiYWyvPdwknofu43funb9n07IKJxppgG8s0ShOo5UX2laO04F0zUtKhYl5GFHKjv6vzf2azMw3gqfik6jlPGfpS3MVZlhZJ4Zs7vtBLOcq9RetpCe3nDT1L2rnxHjgMRJf0RFdTzby+NHN/z9RQgJeo0qVK9773P5k45JTvtkyiJj9n07/uzMCy4lDzkv+Sz7BElNRYbenX9tZoK7domJ6HLZj2ZJmRkNg2UkpWPnIi1CtFaVUOF5ebMaajFQmOVv55H/yefn5z6n9X8uxAOAKjTKCgp2mMMTocR7S2b8dbXkNhP+XINNyoI4RN7aQ+h9FDPJArPuIdCGWN3s9A1ziQ/fVXJ+8N1jV9GTw2JIhviZe3TWkwwYPX09rxjVcVxzW1JHzP5w+23ZsAB5uq2MlpOcTpnJsPr2pZvsfFpSWvARS57u9/On4cXF5N+OaJhxSLj2qXC0WpLnEKoBUAklpvASP9gIKswQvANQlQNQl6lLMH0vJ94FLC1yC5EQ58hxTdSFXTql15c5lZVddrFRX7ivD9/1eZ7P3zJ8N9VGaR8W4pjxCt3KZedRi0QjDfBciVJxFIYzj/5amdObkUtu6VUDccdKhAU367h+NZmdXq+7z6uR+VVdedZOrZlWeTm6lIIfpXFtqASThoWGlARpEDgYmMNAMptAAiAL//+1Xvp2bPS/Ad1XQEakWrieqZa0IHSN66g3VnH4h6gCCiuu4yElUJKCQwDIrEj+BjPzu+7KfUl4i4qJHzVnaqlVEyq2v+bV8t6/0RdivHnvc9hpEZCpBQghTce19yHT1wuowLr5G5WNJaYA0nDSsUNdG97w/lwaUjjHRSxUhZC6i5nh+FlTAqeQUdvaZVwYIYSIAzjr7MilKIpOBOhtD5ikB4d6SiISiYU4HwDg0ohx9BSstIQ2FY2uitFxyTUogJu3oVScRD4muPtmw+hGy6nPk1E80eUGuuSWLY6XKoACqQIRCNAIsUjSBANoW0bG2kuWagFIVAOwRvT+feP5784HSiwsPvB30hr2J3/EHT21+4z1ceOrW9beU/0dvhl+jr6ZvpO+ggfvZ/gviPfJv+UW+zrEOv7G/JZ+SL1e39KG+rV/QL5qx2TevtWW1517rd+pdP/YfDNhUzWYzaraa7Wan2Q/PhGfDy8LLwyvDq+Kw3UosYSpSmTbSVtpJu2kvjdMzeI+O6IRK1CCBEhUyjlJj5IRr3OAWJ4xEJEiSoS7SQ86Qh8jj9DbbZSkbpcdzTZ5ylEJVBemmFObfV8gI+++r++owdPybur70orQu7Tb2G8x98mdocvMw2jGWTmueZpmmVIaDCACCXv2S5yxRzudgMgMLAIG7n12eN5hklRD8nGsAAKJFAwSAZRANr7dBbwbSw/bmDkiRAID/wwAQfOj+zAGl5WaD9D2myVuIR2vRiWpEAI1uHRnwOB+pIjbrQjPC2Y1VNbKMedc39w/7G27KmX7vm1/bVz6bM/v2PtKjvaYX9fU9xd0r+lPX2tV3v3S1XXW3s1vZlXbD7q0rdIFee6c4PdvMroz60Xa2je3dtratxh3tbFe2pe1wW2gDrb1VuKnHbMvIH03nWI3N3aa2qW72N+vdR76gKWz6m8yvMtGYG0nT2FQ0AID4vTbV+y77Wj1Vd9fVdVF66OzaXRPVhbdOX2W/7PTmwcrVZfhTfVM6S2N5XOrKuQbcPd1Z1pcFJb90llhxFq2797xSk3/SmcbcRXgJgAWA9fkQ6LbO3Lo21UtRuyk/JF/Mshwr0ws2I8EX6N2LsRo757wMore7sggvzNovg3N9j17Yaj2MdRJQcV6LpAJuYDxu2w1ABOcJz69m/42MTPXrQH961fV6Zj9GeD6Z0Vkd1049ewJf3xR1qmafmvkkzhQVPE3N3sg5q4QuzFz0OgNiNcA0HaORu/Dn8Xh22ib8SvbEoJu8jmmliPt0oW2V9y/VkkTg2+ha8Tw8N3huPM63zjIz63vcalRuGiiXxvQ8Dh7w0531B0KxCO4hVJEcipwJnUF/746Ih8hYXvg8P6GchhzttYYmHUh+gz71i5srOdUrizka8TTkDsnVOMn0upGY6tsx/7pw5WZmvjipWKO+1JmZ90dMwVP5NrFceE5F5WIMcRGDTRHuqZPCuDGxeoMJdojMkiWMczBm7wnf4m8yHJ/psB7vZvEqAGVVJJeUkWRbUryAgc26VQDG32JySV9G+xyjXIJL/R84GyJtxk0N2Y3aKRIfsiwrEooDGUtN7CoA7dER8KAut/qz1uMWX4Z5LrP9KgqK7znLO0czWzQsO7PgUfTzTfp6DwP8gDwHM8J7GO47MbYUH8bYYVKoHRXygglvJgFMuBHPYDIYl1m3kb/NIAeoAMA7VvN+X9KNszM6bK/WqlIzlfl9ECQWIZ9XcFvaqp6Z+uG58vlc7PQiUlz1BAxa3Y8Mpa7HBg+dH5I5Z3VKymO46JAUALV2wRo7bdJPaRVo1FpK5AtG3FwDkP9KGiaAp7+IhaesAPFA+VBBAxM763IcnK/mTj2NWx0zZS1Az7fyOgDHdLnP11gGyBQLcUtUt+oXkaD8NIh8NitfJPHyYp1yWPNPsk2SVTuzFQurtJoKeKV7juTzi0lrkPWQstshna+tQ0PZfdWjuXymNS6HwHsIkFng4EmzQgym9/j7w/rxSZkvuK2t+yeraN/El9FjpZxP+cc0cd7nwG6zvvBeHr/LajRlw+dv2qqvwBbj3rbUAED7EZZZoksycd1YXW2Vs/ZZz501Su4qn+mHxLJ1aq3ry9UBTEHzPA5qRJZAvoSkWnZaq7XcQ2qudWPEky1z4nmMmxqSO2RzWjAWD8XYSc/BPkQsFeoceIo4RU5mZrd6mlvKJBBbPZtaOx4JYJmshdU5Fb40PtPN1L5avmZ8YsgyY9Tc2n7Sd9e4XaQ2D0JMii31qrJ3PsH0IMMPyGjXg0rLSIAwzbD2YKyCeuvq+rEyzU5uSqbMLwBjGMjKxhhyistqpMa0620u6r3KsKojNXpZ4sLUfYqrRufWUS3eXvPbqfEW/NpdKesfx6zr2jhdpwGtAFXTfvRbtZxrW987sXaDp7WvUahs3kYklotaZslpWXrVzlQqg+OrHWDjqeuL24XPYt3Eci70bDaGpqmtLWokhUDGBFEn8jz+ZbQBXnI04rsF/Zlqsf5j87J83S8XO79QS2NiiP+2QIHhRwrWX4CBJuhrklxZZpplogIlJnvsmVleaDTHK68UamdRpEuXUpj9AbBFBwDAwcQBYSW6kyaCUHrY4oCAGEAYBADoS4VQEVTqZUcIpAPlw+b0F2CIiJGsr07S1ao5cUPycJKXS3mfb8WHP6EApnhRCLkwsbA41IrE6wfp75wBjgz8sEiKQViDDSEx1LA5D4fbGOGskS4y6k0Co41FSZP96/k2ygS4yERHJjllssvk1orlmYEw03Vm1VorMAdtrlS/tl/JqXGJ0hX0Tv7Qo/wYtVpPPGXrWa3WCw00GkXqZbKjHRALXKory3F1DESAIYQLsHKQba41CenZMgoCSrgz61oxFVuIDju3pX+RDXuOECemAnfjdrIXdy5iuyfPJDkcKlh025RCZbdWrPBGHU2glgh3lFRLSdYP1l9OKkAgQWaS9ghW8qNHZETOgmUbtglJeITbFKZc5eAlJ+h6e9M02Z0UukSRixS7RIlEhAEjhnpXUzThah1OsTin6/9TQg6KBzDgnOe8ovuLsKi7+79rDCLwUxmZf+kud2eamuZUHVQJKFBjIQ8OdK6myhoHtcffVK3vK0pvFZXWkiqhUp9PUo++BzMsAfTObbpvSaz1Fe2eqH0g88/EiH+kgV2ISbhyuJ2eE2cuXBkYmbS/vAdPXrwFCBSk8e1jxUmSrLc++uqnv263S5MuwziZxsuSrc2tJ5si3zwVKi2y2BLLK/WSta75w133bf/5NHrplQ4WXRDvHbsUMlwWACGvDfrwnsaMF7CTSIHNb8EhWEgzzxJlWanrVRub20g078ACW/ghSsAWHgK3MQie2w5CQFeFWxVqK3wRUrHLDzEWJNtmizpsrpHg4RJXeMijCrVPK8uCkvmxSgubhcCJOXmu8JBHTRhqI0uSM3LyiUXBTpjCV0QQSRTRxBCr+DmUABJJIpne9KEv/RhAGulkMI5MxpNFNhNprzq4d+WPmyo/A+aSrtL7nxJ1T+EdD5iSBpNzYm4Q0dAs8QFrnHDGBVcMGDHhhsfy8QDtJIFEkkimN33oS799/benWyTaM1hiBg3xSiPSydA4kMl4sshmoibXpVw1zs8DxBmmEtOYzgzNLDk0C/vVTwF3zQZzNC+iQlBEMSVqjLdeKVCWVIefi2kPYGOTwObrU6ChTt0wICChoGEQIJRofomBNU4444IrBoyYcMOjHbZpZAghhBC61JlAIkkk05s+9B3VL+k4Vq0p9MKz8lnyGi2VxoCxSosrHWQwjkzGk0W2cjKYqElhxOQNlctXmnpgGtOZoZnVKx/M1TyOKgRFFFOimll1CVzhIY/UmK1XQe1c1OFb0Er6xy/ZZhBVZO0bRmIBGDJanW8EsJLkNUGCKlhWYg1kNhaEgkpk+TcsUmZDuRc6Qvc9623y8RRVz81StQDJ4CxAYkhsci0WmU36kMxUf5CcvTYS9K+PISKPRXzls+Rw5aVa6d+Z0AQ79dpst/v93RLQnnq1D7Y4/EmSfYaf+bPvdagN7Cexng/6EA3D20IHC3ZXLda1GYzObIfOg2rqFORSQAIDBWmyFqGr5E1QkThEiMuohN9PjuvmQqNPeZjaVCY/uQRiTs47//pDrULRDJCSfwNjYe+9g2D5fkEDwJywCCgOEA4AAmAFQX4RrViwLx/JT1SB7GMoBnpqHLES2CjFtaeYN6e/IkTvVoVEKdkX9ofAyP1Y7ig99ID53qXWAZFF9qHtNozDFV4Sy/t6O5LYdD053+mQoZsPa1LzYv3t25SUiRvos95ebgmWYdXOIGcCl0JnX4ep0DB931zAM6p71I3KRQl3p8CLqZ6CGqdicybjtbA/KNFZqv96bLpcY/grkJz2iQ0LQYVLD0oi0Z7Q8xEMZXZyKZI6l6ohxXUCbCmODK+QirS4ezgSSXsUorVlcXixkpQgcjgUktUOaPIaWmiSIEWinuMgDAUKYaFnTQyPQZR5sOHxNgCULswmjFyBo7zeXaWjTONcw7YR136crpLJNmpYTDexznGnwuuH8ciwcAiqhxkG7TXCpfCkjSMGwvMVmxnhgtOteWHMsAgLKbZzfBvMC2LcydabFF9vyoCAAq3oaMg+ZdgL+esgM2udDYYblzVBgortGTXxMhFqpHoweiCzjlxuiH4aeilWDMJgCGxrxfGr11mJKUxjbxmeuQqxXcESI7AeW8MTp3kV48ovpkEpAi4VYQazpAi70gFUKtRYFZVksXNXjkbGBuxACD8oJgms4yevGBeuCA9rBSax2nixCN92ER/UqDEFFOw7eq0ELccK5QR0ToAdliJwiODgTMPvdDoKP9ahAxpDCu4zqI4YgisAXHjhomTe9M6S9w5+UP7RZcrQ8BnM/2rhT4tp4Kq/EADXIgv7Wry6Y2OuMd9sa7sE0+nq9cw/myWW2///0Sl1n7nXHvpbMCqYHswICuAomAvz4Ez0dvE7VIjp82uPfYoLcRH9Wt9y4u/s8+ofPJXn8wKhWn9y/Q3VHL7EXsU+2/8CL0S1+9jT6P/Hf17+QFUKHfLD8HBbPaWNfko/qz9vropgstPY3DIvM1+zV+PeRvsFZ6oP+sbj+si/ELaao3Acnoksvi2+PbHUx/O5O9SgfuoTyH/Pv5g/n69wjRVZyul9yJeRbyy/XPj43OvFN4vb/OOZfXGW+Tj698tXy02J5jhg8xwXzrP21UiFH5a15/zVBSurTly0fsXfSIsCgKDvhxUOgQEg8LF7GrwO/ZhL9zPUQGahkw7SOEAvDvP0uiwYE4Wt/h3zZWCy9Msu1GL4/DJi+NCXXZxvCkxB7avlwBNck/k3OeRRdwgVJAtNJ8t4J4CalM4F4CmPIwOeVS4AcAha9pwmSD2QCV7lAp94oM49ywHeA6Tsrb5GTsckWLwUY0yEAAAaC7+AyMchDyPm4EjQ6i34KfHuCagbZk7EIzonJYfJlZWCChutwsqkRJiYk2X3jxsvGoUk4S1EqeP4iZBvouW58ld5URFBEkKih1zWMhaVRWPVsBpZTBaHJWBBLDPLybqfzWHvZu/lVHFW/ctDOQAJBz5C7VatoIgsBqISgvlTHdQOupWbHUKqo52sC34mfkoOwI9t/nP8iPxBAQB8/73pTNODTQ80PQIA0PS06eqmh6ZX72cj1knrr9ag+Yk5KFuqyXlp/vdjJ7rR/mJ0dTZbJXRp1vu3zvjZC7dYfPdSgz/8qc5bl/yixm2X/eSjD3pc1QhhiUjI7ij5kIoNHTt69hw40YC/xgc+L9R9dzzw1e9RCRMnXqJk/Q0w8KLz00YaZbQx0uSYaJLJcuXdbWv5/6257mp1z2dn1WrXqUOXNq9irVmpel/8E1v/+eSU07HxTZPr0TmpzHNHHXHMNTSMJEBhCIkpyFnh2FLT0JJyZLjbJ5usvf94f77M/IRwN0WUcBFiRIq2OxP0gzDMoONJxsqkOcta9+81w1TTTDfbBHO4yU4JkiJAUzz1zEOPPfEIuppyLqLEENhQso9kC2XbPh9QRSTAYm7VlrHOLrXe/u4aSfaxEY3az1g0ZsAu9g88GdW8e12rjEVbLqF4DKB7uQRxCsDbrQNg57Y+HvbJjQI3YpT4Ic+at0sxgU5k0XG2VcDSdhC1PT0BO3Eo4IpXp42gfkzKFBqEXCqSNXC4NonFFKSPRcK+XdaNTUR9mjmuAxumJ4I+WpaGJIQ2bCMcmTFhocFNyYxNsFIIjFJxH59k3Mmh1LCNCoCYaRomZYRhpiGsYtusqjBsJadCgA+eNy6HUaU1pbYFMGqWWVZj12PRmG2kAwm71hC13FT0GcNqK2yDvaPsIyBh3/BxYf95028GvGEEcsaNbV9FeXEkjkUpv1XiWJYfQQvq1m3Tft9APstXHHJeaqzaLAmbZo1Z1SgO1xtoADK4Uw1pmOW+sGEsaNuJRGkp7tuKkXGDRdZcM52uqoxU2FZZaYZTrBquN+L2qKmXUWOAwc0rNjylpa6Sv7g0aNjeU2qwBVQosS0zEBAojYNEVBu1Oa/Pw7W+kzFqYiMok7TIJOZSH5muAI0Xb6EBc6L788CPCcGPrPY+UNiNB71dCICt7bXZXEC+lbcLq5hp9g+hhQkFYI8Hipgsr8CHuXjITD3wFHMKmgW1iWHNrDBRUQJrkk2lyEiThbMBfZGu0JgFbbqzL4toeeyi9sY18C6RzGNbrAEyRIEm5vKK50+buURbpHEqq/4xK2v1TxXXSZG6lc+074EtuFHKQmJfWcViw6+8Wi3bRIUArq4CZS+FgpbEycCwTQYblIYXNEBm5WcWc/BEGfZ6Dj2L1Ji4berpVJUXnnupTAs7JcCCYEOVska3tz547Al1Mf8GbIS/sJORCIGsN8tnsGGSxrYGyExsQ+2gVua6EPurGtXOLiAL61xyMRO9Ac+u8Arc43yCAoxQ1wujOtnHcPWFrU8yTSgx9+eQ5GupUs+vymwsFUavvAJ9kG2OS1EhDmgqX2dkHdPzomcz8eZDVCtffO6wzMyQzGX1SVyiJ5uuxRIdWApLfWOrmuWuc+JGHsX9I0cMovjCLq7uV6L16oW5WKuThpWukMWU08nsnFZFDYyR0zJhvpoOCKliCiOBVeX9quPj1QWFqgFFbeRntc+ny+wQG3LdNr1fD8bqYVtDOdKpzkUFoYb38x2P7xDrGJBSJ4lGDcBP81NBs/bVXFebWp9/sMf5ZtALcsrWtTJCwEolR0x2MWV1yEoSmOqXSUGKLUAHGRiVuHKkq/XFfjKHJDsaSNSGXN0cptyBLsQGmzVzcJX1U0o9eQIOay6WOXV8c7oLeLuKSeqTIssVPqFeVed8ovwIaEYTI7Ag9Bejz+K7bht/83x92ugPoRtlpZ/1X+ZGIkjCZB5iH67mE2tpHyeNQZtj9lcjIvbwqm0DaPhCfnSCDLoy95KTGF1TTaRCZyAnZenz0UwPB2rP5XzAdB5qUGNLNLGlcYl6fNCn4sth1txTp47AGB/A4oa6gLxd7efJ7NCZyBOnK6yvQ9xTmNDmX6UX13kZJuDEFcgX7DK1D/hUqkbbi43bH/UAdoJ3uRIwZjHGv/Hv23/dltRt6LwZJMgb4JsOMZvLVdUxC+TOeAvDxfqyeXSRgFqCQifgx1k+G9KLdH2MOd1NPj+1Y3oXma2xLX45fY8FQ1GpNPQIM6mzuVvP/2jOB/sxJfTxH1S9qvcav7gwzKcuRHeAWNvPcDW80tN9sSZgMKE4WSBh/M8n88lxeDenJ/5mwvc3VH/dTY7J+EQP3ibhntp8241PesvbBjX4qlyjhhi6l1bPy+tIycv8y07DVbCepAmdworLsyAfjrFkurerINJAEBMOBWHLccV1hxyPCnYpCVjbOyfyL+KDsumUvLyen0zGdK+HYoVUc1BESW9h1eyCchhcd2HGxJP95wxvV/s9XE0I3q1vnr553wp7qMY/bIoqc0H1Pg6w5XPesdaVNPGTVdaksOmJ1JOix6cnUU+Srqcnt540nQtbcKOZ07ICgF8wYG3D6rbSN/oxA9FA6FUdH98Rrv9k8dTufaecCIfOtxG4670/p8n8jnMaxxxKwJL8WlY7iGdflud9wFGnRbgk/QTCVXBUtisPf44jtVhl9AuSD/EJl7W2YQhFK+hC4e0qIyfKPVmrPlTt06tYsYRaWpJcoZCB26ZITQkaAXs1mivtwK3N23EbsyDQy0eShf2UcrazT6ucZF8CCs8BaObGuMdwwHPLCJ927yA/tdCxKn3R9tMh/UWjPYuE+Kg7/JITudkhPZ+Tduqgcph6AeSOWc8+B2tWtlVGzptEjON7ZI5P48XhM1q4JAqk5J6vjODEvT5WlNbx05DMCiWZqfyHkSMWfImVxWgg6ftWX9g+GCTvyKq80DH9rthYpIQzpo99ELUqVdZGGV38+/twfuzoUOGZbuAN7adD26HjUsPQ7CkkBHPW58+HN74LV3AULqCBSE+GiVsl68pYa6syZD9KZki6M9wM/WF1QOXJxJLodUMDYkmSIzSarmTLd2HiTtuidymMd8HTwJIjJlheXvgZWnpo68t7+3TrQkPPOr2/xO7R4hJU2qipulwNtAYW0ZEHpYVI7AITBCrlRhfqvA/qdehP0Mj37xJjWKTcgVu1Rjerq9WaEEVSDrM8j4/8M+YOV+ulqbrhPJTn0mHWA2m5Rl2Y8kPLMHZH2c6nYCaJaSkomRjCWxco0I2iDhbUooC+oWkWcmjQq6tuBA5EZaY8s+JNWujswK3a7SfQ4CJcx2q9QWtDaxTD2A2UoeEzzOZWfws3U2vLXX7ZNtTMx+Ims7WQeFBlDdyBGjMoeC72QmvUwPUfyRAgb0jmgmlf4Eo2kDNsOGU06XUoKJJuE762H2rw7cG0l1F61MXZIjR0+6K8ZwZKP13AX8eXXKVQJnOWfX4WP/hfKSoXpgS1BI0J4rH8XwTl5oG+tfNwMPhe98s4byJzjqqKl7mCFIYe97FRZZY/npoawl6INdR641wa/xIoLA2pEhKxcwfi0KjzauFKuXj0fNhx/E/k5UbJEhy/37ee2yeTGEfczT3Vh25prL3VRXEV/7uskz6pBNhOn0/cdT5VcIxMH1sLbLL3jZ917qESu3jLFnplgVe0K/FJ/THxsp9BmengAvDrOS9LdeaCIoZ7amTVfnve5EIGJqz+b4n/QdcKJW6lkcSQb6juT6UIryBSIZDxHXCzyDWrzGahDdGkaX/P2DZHJDilJ+Pfkcw6eMAfQYc14axs3huD16x2ktGZAAv2cPyp2LxW01+y57v3xIJ727L663qH91nz9xMPu8aV0ZR81hu2To45AgdANkzFZVScGV5RV3Ywn5w3/Sx5hSyQwngUFEGwU+SZVafz6g2htPXavpFttqB/UuePfe/l1GIj/oh+AaBQVjrrSiBrJ/EAMekgRopdns9FFDySv9JjnWtLr1Gps0KKwK5uRug4clZjLqgqCTItIbTP1xSiIWtt2Va1Lf5eWA8bD9/Tk4s/9sfvmVfG9+1mfhI3P3+IKN5g13v7xfH9rtfM1MK7gW1FS9vS90hsPDleO0ZDhEyVNwVOiIi1UCGvXQzGLfsGxnY54r51oKDdAOsD2O2IEPhqXTyvmMZC6LoZX8QPBLGrbOD94vleOexqc1iWfrFnTp7PNCG/Nf3sEyqxk7dsflLmeUU7b+5Paq47qCMO+nK56WWs+pKzQ6drRZ3IwIQt+KSQrRk8pgtKZF4VGvBi94I4eYZQ9a7HJsYb6+Mx338RDsv/N4u97Po358fH/Rbk0TdKcyHH8Hpp+hq04uPi/DPq0rBhjS/zsre2wtdDBowkb61QZmSuF+KriBbYausYsnjQLjUSutld910Gx1QE90aJiBka4wTrgy2I0dY+bgFHxx56TUhcpBKv5A+BBVp4FNWupnrxX8L4/7o4IVJmMKRk5lAX/r+g6zK1HRibh0HPodaUXbdU+m9JzZ4HT+adD2YPVDMPRFsOrGqYHjrb+XjroRrmIWAJ5o8Pxu4Ko78GWusnHx+P3ZOIUiKgQ5l+ZUfsaO6XijtazDuUaSDr+qNnK5X4w5AH/iYC92kyf7MKVstl7qjy7recrsSeab4G1ov4gwpNVGkIhSoWkr9c7QgFNN2wiI3qk81qc1qliM+oO8iy/leYH/sbs1/hyw6V7l9mpL9BMi8d29sWG7XhRA+mG7RVxBvvNEujfpnGEjM+/rkzbs1x9a4R+HKzsECW9ay3veyta8Z0z3cdYWBZ1wwuS9oEXo9EAZFCtQck0Vzj8PUXZNNk3yVSGdvEGTY7fSNO64TXJh4ko90KO2HJ2nRdVr0sGlDqLDkr1GExyOMBFZDRPMOYbdLnkAyS4W6ZRZvg/H3MySrxa3WWrB3qsuilUb9SrY/rFxCB22XNcoCc5hlB7RM+u3jQF+lW2Ig+27M3KWJk7yVf+XT2wmqbnbAUbIYui14eDaogS86m7bbppBG/EoRpxBjqWE3YpX3+YJ/MziUqYak+XQzzJoO5UR3KfPHiStSH01iFrZ7svPxgrB+9c2NLnjAXrIYOMyQNB5R6c4vZ0GbRKaMhxRUrzepBC1B5twdPkjbRABHpUFg3qvjZIvxAbomTICEITtpkw96C0wX8YsVG/kkEBccr/SVEf3KbJRgRSstu3V2EtbUWqb1qCowtlhCLjldA6fvmNOe+5xLoh31alzzKtji7KtdlL4zbUGzEjoz6LOJeMtgls+K91pN7y6dJTynFGeyZNrIUxpzZ0GKApGG/AtLnDIaCFZKF5q8LEPVd8smcK/a2m8zmmE7Usl0RJOUEBXaQFrGLr8BHpFYgIupIom7lXNkQWTYENMFnBELvU86MrcBuRigSFGoLu8mIb0pPhPgl0aTMiJZWDIR9l0hvZSyh7P3xreNw/H7RkYcOMRpPF8MgW11TZb6V7TtOpNWQI42/pHpo0GExRnWSYhHfqrI7UAHfyf53TMXLHU7oxHhCX2lPOfy+Da0SsYnmmUCd0wGbtD8Q6pVbCVZjk36bbCAY6WltKLD2hpRQJRu2OSMWVIEiVl3feOi/kjK/vsdtdF2syRUacjvzQn2ne3zpswLU1Rxe43e1Cgw5H7HlT8u7KqLnuz8mK6YtzrRZ5Nlxd3x3JQm/dy2nYI+Qco+XOPW8xGFpozkt8eqqmCa7Pn7/yi6oN6x1D1ry4KaI1MApIZTmgLfEK3WAizQozrWgL8MNFSGDDkK0oqbO/xA1bzhcagVEJGU6d4/3b6Th72WlUv2moGk5EW94BHZrFFpvVgoY+1uPUFFnSy9kM8dECq+GT4/ancqi4/a4nVkXshAD6hhEwVUmgrWBUmchUDdExcWqn5rnxdqdOombJ0cHWx4Cl6k2Fqf6xYqOEqKOU6bOkBXzkyXEpERjvnoVqyQ8usJ5+Gn4mmaK64UdFFSO+xRE5qZxkQRvaPNlVl9b/Am7rdUEji+oCw2da/z5LylmHTg0pS6UWGKeWfL5l5rfXUour/N5X6p/7SXQ9Hn5ruLEVRf3nfhq/CdleyjJdd9g//811L5fuerLFc5dp2Wcz+bjcj8V2WMMTp1r+PeJ9BZcZqdfDMqL4YU7n4BLiA13Mn/yw1SiLyFyIj9kUG+zvDmYQ33BIdkss/z5mJs7/2F+E5jfI1relcxifd8zAL2QG4I4VT9svqY2O1Pzxc6GWmoTS15ho2XRT5kczbuHjWm1QYpxbCnO5T0UvKjdywcNvdqoUh3Vmw35gsGkiypUESnwjE7+HRxYoLHBysazQsg+WgruoIUmg/bd7UnZTYmFeU8gPOHIzvskvSm2Zt4bIGx5u6OftREfa92UIP8sFnGfdCRsBTvTbt1GxT/oOQ/EyNdfOP0kYxvP4HTYkTZfPe6uthKJHqXNXpDpwiZBLSbHnL5v3359nIIDlmZuE6LeMyiDmkNRfVSqDGrVIifOU5R+dvj2z3+kKPixYvzstx/+mDNrWm06UdqLtPPARpuH5inwM5fd+OUMFc7Ate3sQbf18HEg0Kytqqy/qRjN9BLXapJ6udCJCWT2sGzk5ZF9q/HfPCFJ2g8N51h6rN2m77KZJC0+d5sQlNGQNr2uFVbTs1BcdLGiUxAx1B8oabIWtPqCnXBNTztduCasVsd1Dn/AoYmoVDG9wx8ExgdvG6Pgz1PwB24DLs3ZC5lzFq0068eUNUuqoNpoKfQaEWNCoiYhCcuzGS46hbWhGD46g/lwQ1SmDGiQCOE2xRRyvwqOksPrJDCP5EOoGRIj3JxAg1rAvCBiKL7vDx2OgM81dQICbUU6kO6AwoVZ4FBHChgexKtn7zy0FX9ufX9m9cwdB7c6X3jwooQjk1LfNjYfWZ9nZMG/dWwuuggkKv5SLLd9Uj4u3PrSOgYwIp98geGJnDio0iN2ky3vq8Pd1TJvokNptmZkUNjIq0ElGOr//vXXWyk4oGnGFiHiPYwxLqRQWBuUyYNatcCJcqWlZw7f/sEPHwW/pxh//dsTT48wq1utOmHag7bwwGDdQ90U+L7LyfjlJBVO1j3kP3sQsh6+E1A0c0Ho8J6EGSvzDoMmolWl9HK+E+aLBadPLn0zvK+HghOSuH17IM2C4BabttNmErd4PC1CUE5ztOi0bbCyMQUlfV9UdLJrkf1DO8hpdXkLn57EvWd1EFLGtQ6f36IJqhVxnUR5ClifuG0NyFvk8R9djgZ3QIaMRS/J+bDva47KgyqTudBptOsjEgWpkTR7elRF43Ar6kTHJjA3DgXl8gCE+D2IPqCQBtQO0te/Trgk52veUwqXrAL1+2CBExEW/xdDwIdPRb0on9eKKBrT85IdBZkrUhVODH6isXBHBJGNxXALHuwIPwTjUdyEMA8fXwkzddsE/v9xqI/JtdvBkqo9uOYG082AwRemOp/kVNe910h/5MS5t2GjVu8ya5pvO9g13P34dvA1mv3omgJcu3CIzv+O09zOoq5efKZwzYMLy/pm1tTDFlQjlSIePni6NHdq/vNiH6/YstVCy51cO3sD/TUduI7m3LUQgFcNHGzkAi4j2Vzfuet++KuPBk8zlQ/SG3h0E+rRySROtxDspc1e3MCO//nG4rWZm49d/PWuSg2G6sQip0skgtmfsBmaJs7HHDoEqJ91nFpTNfRRB9hH20lULdPBDyDXP8Xgen4UdVCjjHeopNIa5vFHcMEHvIvsJpjFf4nVhGhOM/gNtS/WNWGNq94H3JuPX/zt+XI1hupkEswlkAoerBMwdR8sW7xWscT5mMPQ0Nk/cOgQuABvzrnPur1jMnR7r4cfwUfjO7f3+nkOfr08A8/Tu703zAP4WAm5PesU/3xy/KkBUcdzHRT0EQ8VCK6bbvh720k6az9PdOL32FW2Dg8id7L6xfyPcuqdW34WlMFFRuJh/PoK1nDXdQINbFXJYFnJ3ttObbvjcwFiHb72FpfscrAi0WpDKTlAyodC5UPAZr3t8k290sXilflZmy9udvU9CS14rado5oHMc86qUKCq91yZ08Y4cHpjNlyb2ZS58Zf40hNNKWIrPL9ZXscV3280xPELeNlzSLggN5ljcgUpV0kJ2PYtS+ne3tB/TtkV1b4IiSsUvvh7DDasROz5FzYpanmiEwZjTMHsKzbLz05bYmnzljeAhvrDEvUNAOSV5qRSFTfgzp6kKmNUrYjpNcK005UWgrtKTV1jM5JmbFZcdbUHlW0S07CNEnzsd9cYiI2cnKHi27JvTbTZCLF5hiwjJj5KOfOSdQZA0/QOU1aDQdN06eemqAM4z1PxQhVhNbfje1mD42TVh5eZfdbHettVj7fchWGIg0zeKz+cbtM+AcUAtdURWMqyRwiUEUWspPnxrtZTaz9/F+4Ct7fCTnJn49PwdWw6FaezkqrGZ3ZmSJhDxTmMqWD9CRX1KEYNNj1lf7R52w3stu56YG521D8V/P22OAradCL4FoNDwV4QJ7mz6RnVljwob+SGG5/emSYRoN9afGryhVT+TO/5mbRwGqTgL8R+AUA9jX79R5ugbChEi/bZfCCK30A7bZnnSVnIn7X6pIKaX3HbgyfLJNO9kBLPEmbjmXl9sGXAwokjJ1oef3bOsYMnOeDsgLEWO+MOEkFuHZBKXBJMpBXvhsTvtswd3L9pcOLukO2mnh7T1kgOuWlq9iZnIbnT2ttvvMbvlPYHbAbWlNn/bUnNYbYxrlGljA5Tb6fdrg4Jo/M0P8L7NxYrr1Jqk758YMf2UEtgk7G9U79I5oK7dkVbZPEqzX13dtUbasSwWOCSmnC3QfJ7dJXYjBOgk2ZIiqCAUc7EV730hl/24r47mgTfC1iKM8zG8Mqaofv7nXP6LY2oUKtJprQGlVsowuWQPOSxbwkqfv7PoFT3SzN33Ttlwk335A68YpKh+hgH/He8p0SOSJq92ZzW45fIQ8UdftDcGx4NV+MYEwpadfx7ZPTG18eKAnXOGrtLodGH8krzGNv3SXPTetVSpukkRkAaY7BdwSpD+CfYzfSTnUXBOrzG6pY7P4FrkKiAMWaZV6diG9+jN2y3Z3jQNgU4LvIv6tvadOvJGLx3bHQvHPNvWKP2Nr448nCOEI7PavM53ZzbJu31B/qkDtccfUW0c66Ib3HR19lrjKuVKSNi6mwzWaUY4/X5bw6KxGJExHOrzLDbIHrso3v/p3DRQazcOeSwD2JGSZuPaJcYnIMOh7QySNtnt0n6zIXyuKhFqwxFlFpz+4xbP7NwVFnOL+0QikTMG/q1fbC8oFpZqN6jrpyuKFOVy8E9btrZSYpTB3X1JcM9tqewLV/an/7SSxn86q7nX/ycuvHzQ3QroHhUivIFiEQlJ/1yFWmDSpS3P8H85imGKCSQPikTOcAeKaNtUeaMcPKJOVQeLaSwDrB2zHxzqKJ39plvCZ2qYJi7Q8yey/Wed0MI4oyHo77TrzdwG5xrMF+IHI+ctGPsaduG29pnX1sPX/hdf9cRFn33+KSAf26Yx3qTweJ/NcRvPiO7T3XQ9UkK9ohbJxT8UJS6OhU41JvQXds6vgEhC1e31yc8jGqs04+b23XevGiNJ2ZY2+V2uof9DNTJuCYWHpK9VUWBn6lm3XfgyAkEFLwTfdtWj7cM6jB7RqlOrPTSrsBw3O7OBqlO5GyEgr+dpsJ5zn/vavwBiBLTeNb4gaNBoIh+qi2rPPAfY+kclTjHOEuycfZunF3GgWvJGidFBSZ7n7xjy6HbVY/f6n3itu23394JKnFyyXYslXaHMKtu25EFhhEl2RrP+uwiqQDMLomsvrXUfRfVu/YkFQM9htGcoycFIrC52ub+cyxxru4+X+19Z51xdhnT7RLjUusFrPzb8bSUV9989CZsbcyn5ZxuagNNu2+1Az5Qa8yJ3UOt/gjYl8F+91KUa8ERbV3GuW8ZwLcWbiMVRGbn/Q5eVnbteiCnMUhdrDlO02tg/MXzbaPQMQxFlMqIxmQsFIwmKDzTMGQ0ttwfjZuzz8JhHm1mc243c5mnKj45KVVjkhSBvBHazl4Ll3kEaGFcWQAp6vnpd+nWZo+YwzKLOD4OgFtZXJaY0/PH79Kzm18O+Dg+sLWstKNTzNDkCGA/x73hpuz+Hng/EKKswfsZtux/dtdquans304I8bLxYzG9QLQuXXitT3U2gdv3x9r3R2yZRAaEr4NQPh3LejIFsdiecWelmIcPVgyI1kq5deu54lYJp/6qOxp4DTVbahq4jfUdglfWNZ4UaSrLZ2F78tc/Gf9d3dU7LLZpGBUf/t0jxRvxSlf31E0D+3s2718+e+lI6WbvWMf8++y/bpJ2dI7vo9BkI6iOedX1W3P7e5D9QIBYKjc8vYx+Afg4/OBjrysrNtas7BCiRHeFguQ1bF8CwYnC/WlV/9lFfzzaEFVd94esvHWUG9U73n2XxaxINRQDXgwCwISGpx5wsQDSYwZiYoAZMQXZsRBWBRbGIpqrTBFAJdNFfR/EDMTFALMCBROwiWmwihm+OAb+DBS/G4fAQhVOMY16xwyciwH+jSmoDyzcxyemoTNmYGQMsCRQUEJwoOGXImz6WnAXHea73wCeDZRjg7DveFbTijfuBGuK5OowKVV2KJwpENfEqCBSN9DPoN+oG2LRfrhlI9NA/hEoPqdzDBLSDtJwhZN0dxijBhjeQPUVi+nmPIPU59Xn1edRcAtdRmaBFtiuY0aHo1b2EBvTSlBsLvZ0z9jQGDb3OHsvixNUNzOpCTV+2VGT1RrLORQ0DEJYpMMj5W2jnvxO0uxJA/9nnqbO15v2e854SYFvCPP/MAC8a/2apjnGN29qantD6m6+VD7wI/XUlBWpcYx40VnANsZu4Dw8qRl88uOXVJnviYAVS3eMb/WG5EY+agXu8xAeAPA94AbsgCRUsCH8r6h+3KI8BO9mWeFBAfdPiWRa+YL00gC0gXd4gBZqTKKuLEC88JyxitcCmXLxBMxnwaNFouSIjgLsi1Wio4A6Cwz33WiIKKieAojFygXAa+EQfF3vgV5GiH0iD5W3PDzLSdw8BuAVTbWt5ble/nUKoRG1ljemAW6KPNjcbKxxtuP+HYWHnV2fC+Uvht105QAgZRjgrV6uibbLDAr+YqVIk4v+u6iy0a+xz2DmciQfik3hF6ggJViGyoulrXyuDGFduVVdE3Wh7qmX61+1tQlviCbVdDcTzavN323v9qr2507VJbonu/peyuh6SW/sXX2h39xX93f7Fz2ivyqRMkJZoFxDuZZyG+Vhajv1sXUgiqASOuE/nIHL0MUO3Ig3qITZaG4xu6nD1HnqLvXa/CmKxHihxV/is1VkVVpN1r/WTqvAHGL+t/Li+8RNEzsnxcm3Taqb7Gq1fvLTKVacPefJhXG9uWxuzZRLUz4oiOrJigDF3mk2yqppf0wXrzrU+uwMVDtTla46M6NhZqDNypmHZ/VSl8+6OqthtoOmCMYaDjT8Yl7d2NH4eZOlaaFpT9MZOoNO0P9Lv8BYzphknGIWMZuYOeYdzDPNnObR5v80/+Vdzcqw+lgzrC2sG1mfspVsK9vLTrDb2cMHf3Em2dew72e/yL4UAA6dY+Js43zK+TXUuDpuK/cI9yT3DPc89+9I5Al5Md563tt8Od/H7+Nv478koArcgn7BdsExwYeCX/OcUC5EhZcKH4juEEfEr0pQybzkKclZyU8xkFZLu6Xvy3DZLbJP5ZVythyXZ+Tr5LfLn5F/JP+zmld0KhYUNyjeURaUG5R3KZ9WfqEqVklVVhWpyqnGVYdUb83qxX1S4yH1N9Zv7gfmUXOxeafm8xu/sfHv9x++/+wbw5uGn1JafqvS6i2Bp9fWKdCAQgrYHJAMLl6BPmcpyChHyQT6iQQ2P18TAHyvOCHX5LElpTbC0elSlsPZejyeWM/ym3f/cd9JFQB9GaREb+7raXbB1d3fVzQdvwIoAEqQMB4RQ+qLd+cklbrklRBOeu/oH2SRZqO/CVI/9M9SCP2HlE9+C2VS/pJA1Ss2PFvnltSpHmWHlpSKOUBw5ujhWbqTv3DLJpGfeqrMyvpq5eo017whL3QI9d10SykUQZAXq9uy2jD/yWRsJG3ZBrieXO+EwguwPfYMu/F8NlTZmC6TOBqoSHy3Phl0Na/83D0QloYvqbLpiGBjEibpC6I4sVkgd1Qkkz9kJ8UFYae3mQH0dV9WMWX9FHL3v12VV7z+HaDrdsurPXw1fFOaL4RwQfY38wGJ8/TLROsmdboiN1B5e93ba8OJPVh1jIi07CFkqwRM5/7ogBA17wRZkUlq8HjFxwQDnAk+hpDSrEKqo1pgZQqTXAWFWOgTrka1aCgJmUqNz334qybOslm5Q1VlybLTG+dEk0BDQbE3klZpxf69+yOxTxnDctRcXmipM/JHqIABG2QpCRhu40/A6GaCGC00nZkXKq2057hEcGJtNdFNUst4wwCxFCyQvpmb5jQxGdh8YkCSWUhMB+BQJfl76Ly5/SOJn+gHd4DvSs4749PChBPbCunUHG+ZmjYkGF3cDodLU40Xh4k3/Wi9F7dzGb/pVeu+uKz5anhAPyxYht/vp+XmttinveG3kdPiVe9Il69/D9bCeQMdZc0y6nqIfOsXyxBLHw59rfQk9GXSdPID0Ig2BIwXSOONt+DM2i9iK1NzrhDjLgGVTUDVRAyU+G8qPm4jtzhh0XXsgxdaJa1z1j51eFKWrKUvwAiLMPV9VyIlIMxlGbCIEiHM5j7OWqR67TNIZUVNF+Wok2Fb2Vs1xUqsFmuvSI0xReJiGcKfVWGMmumnm+fS8mDzjrvfL8yG0clouFFyJFKIs1bVV5fx9EHXYNJYVylCbhfX/NZC+tAbzDCmGXXkciMuUjf04dHZdmSQZ2JGVOpOwQe7P98+T/jpj8ufBl93ZUmc86C+A4IQhUB44UaCkbNEbrwN9PcRbYVf4/NXS+8d/XGxNAv9gNSf/BYggRVBYEzeYwrhPKUmdzBleS9Vbjah76T/UdAWwf2H2b8plwskBBhHw5OkbC+gvLVZuHBJuHZvGD1/XeBkX9MWzMxICyoT+t2EWPNrYRt5cL7whzvr897vzvlEGzj0cuRV8ruXzbnHDAQOHJw2G0iRZnfDydZXzQLZsr3Fw+/w8xAXI8v0yp/X98bh+xbIM6v5hsyExuJ5y1iLL8hju1aOfq2tlp7lNdBrE/Q9lK3tq3Tltje69ne1W7faWd9yub5bZyqoL589qF1hHT/j/aDkrPhRbb/aAqX+hrcINOwbc6CuGz0gFL72CkH/h6t+MUKdJfApeR+yoWmqjDpUaxqXv854iKtFiEjA4Sa3PctSUscGgII3fZ+cIVMb8qyvepVEG7E9rR+wLTYbPal1rJIMkLMl1kq6bdEia73nwDcOQA6e6H9+5JvwrD/GRWV5Eb+JtqSQc+ZHxKHvkJ6GvlGaTX56xo1bgkV17SO1WH4rsFVtZ/B2aBLCFqppiD64XLftIA8az+CtZrpXHJlhtIhfBzSOj5EsYROnsdmvPYG2+L/WNS51XgFnSMPJN+Ex8sThYYrFr1YYarxkZFwymWkUUhPX8TiMnpMjXg57+7BZLwcsF1X9YN4B8zvwdG6/Wnzh0+aR2zvn7Kh5oX/SOdrt9aJ5bvoHvBwm+1ASj4Ods6z+7yGcswk71EgjA2pegM1Bl2OMJS0bZ/kQLgHngjJRIcsjI8MpOhyELlRNGhdkNfQtjkbLT7aH5PFhlcLk5FXAYJkI2GiakzFwq9TK7B9utY2ELrrpzYg/R3MUhGxrY8/a03nHZjJyD8msWg0Ti+C0kuEojRBnE86kecUe7pHZ0IFjsPoz3Xm6PK2TZHMfA8oCg2UiU62kDJ+kWQ6Onh+cJo37gyT27T+X2eNlw2Ph60VwrvwifduOvkpbMCCDudDmyhUJ2sT7W5EzeuzYId2FZqztnD+T2lccVNu1g+5ZPCIukFd1Fr2e+EI+4X7cX3j1f6ysu4mNdXn0m3ltPN/A5VKKFdkGw9Y0Ri47NNwETjCtBVkQD4oik9jNWc9qkWqnC8ZVoZLqKBjhRnN7strDjy27Me+Q23tVaZD1Cy+TDx3EzDnoPsTLxzWpQ4xNi8+TkEZMUfN7e4t4apj08dxwMUtMnKai5XcrP7PKGinKJznbMCSC7DcUopQBbqzw9NGrHggt0cOxFlxzO4M8ve9hfQCMO3LdlmbbMaiiPi7130Phg19zKhJpsPN8raSM4WBGCDtX+LRy+1eLTso5EYgf1Tv4doG9u5qtiqcQx0agB3rdog7UiFQ49sbKpTpcRhBzozymOhlbRQm+w2t+5lLf5dEf6Zdmoe+V+pNfhxAV6NGkSt9l7aGmulcv+JXbefIlhfX/T1wHrC8n1o/c7JO13xa9x6cDljeHlh7m/h1IcBqtMnlpasQlooz1yZe18tm3Pbdz556Vz7898Smgom73eKxnNiGX7/LxD0HoZd1N70a3Qq22kcCJBQZJj5yAEInWWrMBIX8WZaV+NZ1cfjR6ACQPCZa9GuTHkT2qgcImYsP1JI0OXQR4jryX/3OKvT8zb9uTL/Iz/3jvcB747pIO2dEZzdLUdVLyG/flG5Zr7GcEhuP/r3hQUNPWq+GYqg+4Bbvjrz5To/bzeQM3HEg6XTfzUjyD+/CAvfx/zLiqELmvEfUNm5g8H2jKeDEI5/MVLVpnlBDy4JAXOL3EEbbaaKXMeJfD7RISHBfFFDilwswpqX3HtxMmGEjEanVXQ6oqTfDfq5UnnQkI+PR567jV0EUeh/l/mSixxdBzvf/pw0akwIgjkiLkMar/dIJZ1S/B2ukNevegxfT0OA547wabCXs90xaPGZk8L8YTyMp69TYotXvDNLI27EZeDNXIByEd+TSs+mr0bX17bB+NpxRVpavvzgPNmxxDj7Khn3kWt9xv9EToY1JlA/QE9XBwpOgyfsr73EDTuXM35NWvKUCFqztwEeIKL/LQP9nana4fOAHXsZSybvzesUuGwk6prl4ZZ4+gzQDf2nkYT6tuTodca/sYdry7Y4NJhTzY8CZqSewRV9e++HJjRh7tfPdzTzs5qvSZ9z87XLJ4N+sf+8+0GqvvpvCdG+59i4wPXgLtcIWteVi5a2G40E1mwHTBWPXBpHec1Xasn9L/qricqYO0IALT7omDbZrEZTdHhpaKJcKRSNaw9sxwjWMSC1y0sDGRzqcuYwisqViXmkgYh1q5zqT97y0vV9aO5xNcfJM8mUKmYroVHXK1Ihvls4X4OHlwEOdUOvYCi4TEwfmnDj2GbNKOMMsCikjbe1zT2sgkEVmJMBOGJyU+vX1QYXdmjrvlBE2sYrVnoKNnLOE9O411ePwWbRNpK4q57ejbHgxgiJ3GWi3FBO2YdXStQUL6uHYtjpeacDKwuKkRqTxm8UHg/R/MISu6uBSEuaaBN2RdYaYZHdLWOscytK07rQpjFdWwmly5XstRsBUUS/ziTV6BEq7HtXbhGOf1FDwbHomKNfXHT5kai66nwfC4bNiqK7TkGGwwNk5LOC6Pe1p69lWEuvXgEspQ2d/MGp+CFE+RxbSvUfXgEvXP9YEuSs1FbRhrVPSKXZeSOkHDJxgGxBJPcuYkXTsSPLk7FjK7hxWX2NPhqEpbvIyXerYLCSoVBDv7Q8eBOqsaHasQdK0lp6ZDRTfoqjJ8Jql1UJKmGV1xMI+4mYI1WoMylkf/ecmZ7j0hhR4msUjFGpkF+L9PnMWiKBSyeKQLG6ifdLb9v43mgd4rjVarvfOfW2+9/to7nrcDlWnjvaSMw7S+29y8UvvMMunSyKLozdbWLMJ/m02FMY5J5Xt27O08OEV39ucI07QP1oi5NoiZvWIMB4OF/7NnYfYMt+CW/nnjmS+2d9ji4UuxoeOXPEOguKzhysnQ9rWpdTlQZ40jTN62GwfHGzhEsZslhGS6sxP9J5PEyxuJWNvsAF/kvjh/9Jefm3I8eNaZn49P4G33aFHSHL7CkbTaOtZix/FxprzuusSd7D5RV+j8ktagBKIptfA1t9/vGfKC3ynkSb9ts1/RQXcNlFcwloOX7ST8JIz2hnSSyYQ2Lj4uNMaSPqClh3D2dkIwu5dHR2vNbTvL94zzbGq7rql5bjhIljTxYBFwaOWj4xLfRHbq8em3p7awWqLE71uL5ngOz5e5VdgQ+CovAfFHuq3KjETlWW0V8ZDrahuMx+2gkBhOw8WM8UUGEtHng2lti1XBxD35GP9hX1CtVF2tnlEwMahHJt+MqCT1uLUU1wPzFk+ainu//PhAtUqimvAxxO5kvm3t7ZVkHOHmvz8yz9Ni8LzHzzFwAW64aa5ZS2B7IZVtoZeUZUEWf+9K89CgmK1VcMPJVpuuTzeLTu89t3CDDKKBRrRRmCkVNhEnhLF+PJYxOhaBs8DMTHWFVGI2Pnc7KHfFaMJV44I80O52S/lyzRc87DkRhEGj1QKa02r6gUEyK8R490XFuf04eobgUwt4fi3ODNcCDOk+98ifum30ofZB8mAV6NEyluHvoB49MGCGCmXOCQhhs07Ea/lYHxgWR86yZDYwcOYtPAE3T3PoD/mn3zrkbT8V8qVf2qwJJdTvRY02AyNgZ1Ex+zUXGcw4fQR9hK/fjp9MpeQ6/LQWSKCixqW7jj8yHDTdw+zhOnDEuI0pveMLQ5aqeiQ/kDItWUzYIYfCwYZjjDYZ/tWfJGcOHDEa+mBmUXVm5Mdbps5cB9fJRIpr1Vsz3h5kNfSEYfPg7El0SR8a2f98bLfgn2sfdbodYDyknkOS1VlYlm9Wyps6z/MD3EnuLA2LhteEYpUwLYxQXmXugzo40ARcV4wStrsr0gJFM3sObbyXayHtAKs5ldE+hbhnevEj/94mr6rFC3pH3nedca03uKmTiytxXPqfofuJyyblSu2Q65ARcN5st4ESbcx8k5bcRh9Mxirv56r7plPpbeOsyZVrtNBybxheU8XDvlMRRdTILD5CpkSPQJM2pXfE6YdcO4Q4nALRED2SV7ny1yCDK5tcA5ehMnhfDlRVgHxACOwmFI9aJFkOKlbMRiXnAriqpTINrenyPE2O2GIbIvxflO8MVTYxgOF/6M4olXmQvj9xOMTNne0y7TBsPO+651iYQg9LqR1HU31K4KLaMhbmdoG8V8mH8MYcoKVZbr/fPWSN3yHkab+m2e/TOqXVem0GRkdKXIyJpqyH1NBtzQpMKXLJiw+dqxyq6DbqUF1Qxq9sdgZfwVfMfdMUsjNa5wUWOPYNge22Glnasrgw9CjPsO9bChM7VF7g6AYWSZXRDUXp0Mk3Vp+qRpaC7GCG2Mcr0lz0ZbttyuQjvefGrquRAdTmeczzQNJsvy/2QwPr1IeHP0oO2haRPpOdr6Br4+BfV759NE19oJtmvxDC0ueeBl9XO656vI3me+AZ7FPpos9KpUBOMm5k73BjmGgIFMz7Ajf6bjihx+v8ojXrWFZzBuv3yKedi5SXlWec4YLeUcsw9LzjqHrD5gTWY59e6SC97HHwoj1iN69D9PUQro/5zHRvO3ls4VCZdbgRN5pFKpEnwTgpY8vnFl2WxkEH7jZhLOP1FRZ/uTPQRYpxpr3WJRp4BAChpRZHftF9dbRIfooAYTWR4TWGfqKkq8pGcLCA1vTI0w7MSvbv1exH0QW9I5sv1Zv1YrFcrbWBD/es/w0WneQfZrf1GBF34S7uElHO80ZInRVS1sOc4ara9J1cECmZNTTivI5cRYAaFo2gC5g08iwY5T2laKU0lAWbe6aTIIQp2I/9yZKsO8KuMEnc/A9qjG4o4cpxnk+dU5nJBmU2q5i6yVcZQBAL6eKTfA2unoH1kPPUIstQDac+2qtSp7OeYeiyQEvfgSfwRPbU854VlgIMudZNnPMY1fgoIqigRzphSomlk6aFJCXZ+l3PjEXChY9gu7eotUVphXTT7G0YIvOQBbJhhM04TkQKibycvnX9ZHMWdFZoxDHLbg/P1movSVqjWMy0qI/elKuWTLS14zAcO/lypQl8kfX8w86n/jdyBUPZD7MBvW/SafZlmEbAE/sLcjXDnm5gZ2tg5+Aw5zaGSMar80usTJ65pyaq+YphES0ZdBEimMsI9rB2415mXLL+0si1p8QBxgJQxVed95Jr5dHogU85e6S72K8lyeKSfb6/ZncqwBmxMYn/i9BS7zok84/H99W7ycAoQZC6aKMtzNwYHftrwSLriqww/Vy/N2Y6jMvMDj/3XEqxtLGWaCaknFBG61W2XULG2cODUStrsscawfvqHykfKnB5fiYVeyQPg1aiXTdwZs+CvIlO4lLfdMpdcHluv98Y8rZfF/Kq31p6nqcovrOQr6Z4dImzokdeB7nkUHDNDnH9uSdBDDsULH8LK9lAFtnPIFZ8lbr0ykXFHWNkGgF81u2Rj8wPnRNyvpxYKgarVi4z3uqTrR42CJ0WsPqEVVIST0ROxDWPHHL+HhSERU5fjMzoLcULJ7haS1A7H6W8cHKpauVcMbL91Hts6hcS2SonuQlkD1U08xOHZHf4Vs5BX7eKfwBpm1ETEKVhR7wAzcktlrmFCrvShjPj4HAgdtNK9v4gE32Sa+Ezse+F+Wo5B0XMG7h6q7j+/FtOQwPEYr2NWH2+45/VftWw/3/NfbRKuLzRcfaqQQLbb6EZPD/Ntr/ZIzhwKvI9cwZF5k480GUC96zbcKWUl3V0zzA2/A/+vmDx299wi9veBe59V9BRQR74xxt6PZzx6ME8nn03m5NHwcvl0FJ10xDpLNPCaDZtmKvJo+TApOUrMs7WQ0/l7/7/c4YCV8Ol1oNytdEoF5uNztWBiNN2dRjw0vgVKfe1YYVnW3i+haWzvjGcU5jVlv6lCwbZRoTdS7ftrAXx3hyGtf/ql5IwyLY8WOLJl/7p9/LWAuFeqt6h+7HmvWTiz6ZeOvQQfIkd5ltYaCG9mi9WLilo2XX0TroIX+0z+NRJwEj+mavrrCs+RGEqXW5uO1Ar+Mnxp9q2++hHgcr8pplxR/YcFxyq8kYP9MyxceQhywfqyuW0qNVOZgi2RybHt6jMirijtSKYrQNSk0UMNmqDzCCXcexBIWjp4PtHaR3zTC/jDmJUKuUP+qNBz+FaMR/0X4wXUkMfz30Wa6SU/n9bYQUiHa2dQ0RYXyEyjEVHxpbUrpw7g37spipabUybcx1L4gP4gO3l2gUZ1kpAYJIQPJjRXAPPBycRynmmPHASriQstewVS2IeZ9y+pYqtNFLQFYEvYqH8NPFKtlaTfpy4jVjYA6xktDbOx1klemeNXu2uqDoju4Opz7szu4uP42PJyLiECGqd0T1hKZdhEDLG1nwVeC6QiVoCBQWCnSv8hMZxHm0LWQYmSrmGYylWgTa6Jy+djAsZclX9urVVN769RuZFPjl4RSc9QuGAktFr4bLWxnBJf6GjbabPqwWvRBR3X7e8WAVV7n8I2zMbWCzRGB933tdIPbMI3JafvPnrV0BT34rzP/+6ZwSuKB9vyKV7OmFyqmd4W/rx8J8wAZQNLdfyqIuxa+CdFg0SS0UYUZqNx0fRRv5OrrBePQVfTzc/UD1HpY+IO3ijeNq4ujSHbTZMVMcud1g0N7kXr9BVRQv3m6BryBemSbIGcA2u4Y+VaMH+soqx7ZmKZcpwIajujkfqPG0ii+2ThMsnzoqd5PjpQiYCF3S4agsBaLKxa9o0YcDKaLEaU92R8F1vUVP3dw8Q90PHrozD73/QTx3yHjR1BAJOMIdYMT2z1F6FsYRS6rzPPz5KfrNVdu/qZ2V97RczsKIKQuR+YGJlW7u1IQua9Cu5xAaOmUELYuFf8I9rfqE6iX//xx/0r2sP2mVZ9c2f/f8RcC1a+oa8YeL6Ns4QGK43frPLM9yEm/hzDKYbfCLNSdU3x5NCaV/qoanSRvCignZqPQKkDWzBxE0iEbTA0ESj0OWSRs0DjYHJmhpiMe5CwNPnGk9W8fvfoYB397/qqQ6jrcf5Q/RcCgqLvsbmBc8hiI5gBw5VNsjWVmE0Enj/fmw7TpLSH2w5zEX0RnQE2gpcQYZn/qsAY6lYZP77l61DL1cNI41BsU+JVq/9aMyrEhIRWh/yefPfHFHoAxdhuoS3oShQmMRFSJdkoRWGdlcr+bbvv/CtcMBedGwHyuhslq4aFE0339vrCYCw0oVvY1/j0XmzOx/rgnyecUbC6lG9kdneYzFZmZVXNRYSpDHUPyNKRJwCoRZ3Mgb96er1DlQ32NeD2pszZsAWb+OdpPxZ+uTpZNMYyVDZ0xWMso8GlSFcZsjSZERtUxzxUCRga2geoMvEuBg+IamU91obuZhPSEjnnVSITYC3oZoNfD8uHFwo0NQDRyrGkykl6tke0/SdTEjJle8wtMjzB0GQZxuSplMBPzw8omg2fu2Iuun9eYvK6fBhqWoR0IgeoY1JWs0tnyZ+Ol8J2kEnGPWAqCDZXRF2Fkcu9mT4JCFcIvO68UUVi4yHUolrcWMR0ey0SlLqRy1MVklW0RrFGmU9mmlE7fEkyFjH5EoYocI5wbSoJq6RnMLbMEEyn3BHEp74Qit+75rb7nzSpCxltQuQiaNKYvoyVZ3XaFBUzzouHhCgNZ2/tjD2lfRK+2m1Nf2aRBbeO9G2rg3J+Z/Ck9F7a78wtGxT6GmUhMnT1A76JmXFaQ1Lx7MZ+ZFWgGb+fwEvsuxGq0ysIddaixolNRHbPBGM3i5C2f5s9zWLUneCDItwQfkQJ34MohSR1z9yJV4Us+MPLNY2D3ddFfqcv2ucVw9rQTGEdltww/2HufXG4KZKZO8p4cmPfm2v3sAIC85EiM9FFuwfRsHLGi9qazUt5Ydusn+/sDMbWK6ldfAW+LkaLvVVoHOvY9093ezh9ofqF3qdUGrfYMZPm9dUEW9ecaK6ZFyZH1vfbWoXz2E/9vOHWqHkXZMXYeLPL4vJU1lfMbPgx7a7zqlKKUHuLF+2UPhL/jCZhshH28q0be8p7sqis/p7336XH4/ZM0tX2JXVafYSLZjxtnljU13n4SP6JQobOkqP0nB5momNPDjWJ91vkPD4VZ/JfxLmTJmhIfdbl1xXdmMWnCBtDq2Y9yNT49Fa2BhtuhbtJM8PNjU+xohPepaYdr60P57H2BYNDcGEpBS1o873vU1Kbf5/qoWOcZyNguxheh4txK0rhLRgcImjtnnzYPotui1S34QIKQLfEcgXp3bruDDOeVIuhKIr6/VUd918OBOK6Ls8kbVy3DhJkg/rsaEtZiqxHntCTeePe8hX8s2PSI8xUDVNXcWEO51Wq1UvHzyu1Wo5ZTIMYcLAkmpaECDW02pL6OosP2ohQNin5DNcNfi11t0Y2fLtB+QC+juLHd7AW7bdScqUsc53BIbxMgUtGWuF0N6we7SIDWxOw9kw/WnMoijFcd+6VD6bGQQpZm+HGi2Wc0jb58kEYVlbcgMLFzdGnEPbu1RF2zBKSse1GTzEYQyDHEPlJYVyendvnwaTvVcPKUxtHzUoLQZnxVnC5OUU3SrEqBGszzNSxtxvEUBLqubj7V57o0HdJIxWq7c6o5chhnd5KGOifkJUrTGba43BdYUUE4taiqnSYpOMkvR9U6cQLpPfvvLm2x7TMUaP0EnkHucikuIeZ48Loo4OyYtHtR7BmhhcFxOmtVbz2pebpLpx3ds2r/QMwQJ6fYoJw25K0iJBIpMPI3NTLfF2DKvKCMI54dM0JSTCc0xDg9h9paNwOdK6Fwj1QYTw2UEUU2Q0B7EeiDFC3MDfO4fwaRJoazKJu38qWIxg5kS6wNiOZLbHxcGQZTZaClfis+D64KA7k3b6FdS8JqTscbeLDGdVRbslLbGsuFpGyavCg0TrtY61y7jQdZ0zzcwhdG/BiWRjbBbYg155No0CXERSqowsrpPfMnj9Voaac7KWZC4rC7x0vtuBZIaqZGMVu7hdkrBSa5Yl3ZODk+TQ1RE8Gu97ZbCbwBc9VOjEFkocymxNCnFuqKZwhFfeuQhY9m84CtA8XMjrMkQBx67dbyI24sJo5ZisBQwmQtusnybFauqqOzGpaVlakkIbs7pqRi6ifcjqKianW6pLnBX61pEMPrMBKa/n8EYuStgo5AXKJD5Hhbtcdh1Oa28vfEJbBLM2YO1+ctwtLUxzrplk4NP4BDdKiZS8pFkY9Ct0sulppU7WUSKUNqsm6yJk8wBRorJfKFkcFPrS8xAcDrVoDFsEY24kBO2irQCyOpuSLA5YXquZ06UhsIuNZRVcXgQVWOlYWAym1M64m5gzexwRKs9olfhRLmcEiyFTCKGg/+sMLJUwor3SKe/SrbTpy8GiHGEbvQsY8e4mdeGlxid8i+KkCtR06pAWeMNcuOD8tjMZebmhApK6UdQIZSoDEiosVQLn6nAYDU9LSfD445moCBcSqny2jFibhmkRq7ACQ/lwSB5r2rksxLAPlVzTmhrfx7cTnVhYEAgxUFbgukYhtdJdNkicxaJca6bTtpxoeis2kCY0wiYlKTmwUbQIkVQhTuVAAnTFcuS6WrLqV6dW4fOh6txRPavZnlBKV5zRUJmYCxFTWprBkmvf4xkKKOJEF0ooQ8k2wCAjQROkkDqkBR6d6T+3PcaFpuLo2HCmmR9J2UhSc/pYxXydIj6WGR49fTRlJZQMpeAUZ6XopcWFYkAnBVLQrN0aBUViSSsREWBsgVRxmI1x9WCr2fBsYDoqZbdDOueRlqWUCZCxGV64iWolsJ2uUxtX5xKuhOSMS8DvGJ17bmaxLGxhYjxNqb7CPSEghEVI1AiGl8XOO5XkosH4JXe6aBKYMdMMs1KYQxVw/iayfTm8O26mxbNtsctH3SzTdRKT0gLSkpws7ZpDR+/Dc1gc0SVRKpTcrMLAaNfD3CBGtjUf5H6QRyTlFU1j0U0Jg8L5zghBTThjXn9YAqMs0JHYVuSLmP/p844YDOb9oSmdtSGtbCGfpUysy0QjFkRSt8fe+TKY9ImlY0RSXJDU236nqBkZyOOJQrpUmko/bcDzD3PjJzavkoYyXzk7OacPBopq69x8uRHnpA1HPonOsiSNPBJrObWq0JiM35xTI+HCEJpg93L6mG7BGkNwxltkkdj53yJ6F2H+H8U8z3M8trA1tSFu3TSZDgYpDdNslwf0hNy8DfjgqZPJ9lpMtVTRZbysWY5OqzETtC1LNTOqF0T4n/AxZsJ5pyUmbcikt9c8SDFBnWRQdeSIktUTl3M24B8qs1hZwpffJxf202joedCFqeEDSgjC6lbNqjji74KT6YxhW21XA4KKSen/bIAcSMgU6H3kJSpUGR8w9Qi4Pq6C7uH/o8CBmk6IbnNzBnqdKx1tADvY2zumHZu3CKRlUJUTXL+YhWKxeGSeJI+Jd+PdaU4pp/1BxMeTVcuXjKbWmqZRYk5zYzMz4wJMl6XvzuQVukYLHEstmnecc7zhLIXn9etydTqswiWJKFOeLB02H5QCbsq6XhrdOBS76cWCaU65/miU4HFE93gaRIbYy+1RFEqvSQyuFi4hdMz6NgKbM8YM/iIDE5S25tcqabI5pyPNjfWxskVLNUUJV4P7jgT4PLZh82M4vqK20TwgYv4LM+O7QDPYyFPKXBjAQhSdrOoe5BU0eTQuxIrhEDSm2ZqIRxuh2+kIcgTU60MhW31fWniPzM1roUdpgcVuAQH8T7C5dZ8B2l4DyxYepPUeawXzG5gKsGGPo8fEqe9xmhOSwSXGaIVzbuGLqJeexo0aXRg+2dtpBfmfKw0llotNhSz2Ah2oUFMuaa/xCcoGiJUWDkq/yY2lq3UfbV1lPpAFcxHtP58AzQf8BBGinojS2OF394bTDI4mAI8vqcgQq4z6lltuGPCRjhbDqVrRkFTbgDn0sUtodeYNKcp3pT3xf/YaoqkGAfiCfQFNF712b6bOeTgPJhn3cSYHFGrHbQuK5/72A06P9zJLbd1eqNLvS7212GFLuwFyy/UZfxnvfMS6/GRZHcwRXBmTGlOxa5i9fqeb0Ts6CMQl533PwzBfnrhjCSdBC5/kYCklJ/gkM8efG3QroS9h4Y/zg1tzDQYs1pdDUapoGx1fPTU5oe69Ow3GMC4cW6R9qo36Jk//ZTTxcer31IEokNRZDzdch+vs8bepC4oya4LP4hUnlGDPouqAxQ5e/QbkLPeOw2vDvaRrKlOtPKbaY1hBpzXydcP7ZHbPaWKPv6HyYUR8KiXnwzvfPrwqECr0M35pwmgrd6Sj3kvl+98JZuCQuedlHYHQqlbWNmoY4+bjSv8GLmAIuTzQEizYUoKlOQUIk5zM1lKwTBeFgbdHR2ehwKWcHDCySpEIT/qIjgsTueusxTDyCUgSqq2y2TVzHBM4ICpJ3y6wwJZpiiBtF3OAQBWxwPE4shn63WmneliiDcdwLvpwueDqxC19rqTKUudZWabdfwBPD0Df0JQulZCJCRnFYltP5Ce3u0X5VPFnLXyUV5VRUmysQGIAUr9nWmZLfyXsXmxekdniGGAVN3uBP3Rr4Zym+kFLZHfr9eb96rR6djf1V3ov0qegxjqcuGkqe6vKRImjWjEnMx6PZRT8tdyl7qXrXiMM46SUsNOjobKJK89LgOUDXWCmisqvzTvwO+2YNv1W8pgE0Q6us/qn757Pdf22jjAspNeetdfa+1iZnij460zN40AoqhiNn4LGtbi1Gk3tBVMe8lQyBxX8z1fg1Y5Eir1GwCRITfmhP+SPz/8FzYsQdP22Or+Rqk6ZCdGqVm1Z2LlFEiJwW/3YCSykPVsHpEF+9z7//Ql6slt07y1wd4Fm1MxmufXCYfhShzbQHv/G/1vzLm8QVWKB0XCIASRZ61aksHNJasu5lvhEFsMqhnNnd1c+kYqD8aXGZxFTldmJFPrjqaF3BzVoiKSEmxVMYpHCazBGSUEyiInBW211cJtJO8qNsVQyHvSDUTCNJhwHz3wSHXaNPCvHvtCTn0OpjFFIbciUNrpma5WRmkKowg5hjLgiAkAhyxqo2lxja9hELBfxhMvTLbZaKt8aykRsLCeftanILo5l29PYLOZPk2uc2sUbIrGIByPCoXiCtF/nAoMY1ne9+H5zF7LInug8m8Z/xG27E7rAzB/kuE9+NNfOf5abmARV1mEkShaa0crzPTcgmHHk+64nRhSP+c5CNm4qqR21o+LS92FI8ukC1o7HIuMB1VLtNGjmZEkQbN9WVIGb5TWvvi+TymSSZMjjDMBJJ50SkIfxv104hdL7+z7DOHEXbXF+EX6YRyaX/NmS5iC+7LZQoVfgUnwJoW37wAQsco1BGr6SDR7NRfI9LQCGTZ+R+jOt27pQPq4p/c/aCf9+aiucvaO1Y2iiDcq+5r3Qz2xBXn+hLJchn+/mc1kpjuFoRFK4YnNZcKo+RYHCqDd00IcCY6l5AJpInHUmStmj9S4RTjoFXUuwxnHTAu2TSSpn2OaBfX9n/xrYQWR8HwYeuu7+KFTa/Z44m6RGMK5voczvJfcajYHlNtsLBJf/oUrkDaWHXX1msQLSDuf5s+9LTWh6S4cbbBulwv2wFlbCMThgNIaz2tdZID1dLWBkZ/V373htAv/WWW5rGP9uoxvbfNRcowmg8FWFs+cYsjxWgoH3HdONTVibaihBzmyK8+9WPi4rq++nm98xTVPyzePotUpNE2XXBqyGxq9WTyFpSx2FlAttSctKNPJsgOtL3RiZ0wVlOVxOGVMF19Vho605D3cU9CAfIUwpwBBHb9Wn2P6r36MEbj70M9hEQ8KVeS4/fcSlspbVRwvpcCiCgltgK2yw+x1H0wOsT3ITPVRW9rJfud7m3ffRL+5fx+0NqhEQ8EAlTUnmUNxgtz12nSnnOmRlS3CCL6IeAQFRxZoszo5aPni4KHTq9YVQuNrRRWg6LgAACuh5eBHIS0v9tRlOxW2/UVJrg3uoHFccF6zg2ETErecXHlcgkyXJIytH7rvl9Rj6cTHQagTe154eRixQOIGjiagcBzam2cPYObZUqUc027lyWWcdUsSQ5UU1dIYv2GdNiGfxnLtlHRLYjowtPBpIpZuUtO88ciKuKuGnjODFmBBStOUREYI0zeTOjTOx6KSo7J26v/Ynro5aRAvMRYfNmRrdEZvJOaKPbDFKPLRQISu60BaT6iipEE6z0IlOBHLUX1tI5ppzwTqEibYhdD5cywoGnw9g+QmR64wEfaaBtv7BQIuqQ9AMqs5A5CGIKWXSI3LFkNLj6bBozZQXow+X4UdTLEqzmaG3q2z34fNnUk6Bt/2RDPg6uf3oeVL0o5VOGfo/iGIoe88kBSf4sQ3bSMdR5SGPpy6OlJMGOsUCSrNj1KqFF2VH/I3TMOGkcwauuUeiWMUYbpQKSQdiOIqKce0iarxFsVdxsmZBgx3piay0dsGrhZFpLZXjQp5Y56aFqsBCSmu1qOVGh0nWzIiKzuQIuSo5j+oQbzyvTvqdqu8bmpo5jMxkd0WzbGvWH4zm2ysnbBpubfHf3jay2h3LrCAwloh1UyiK5nYdIn7o3KYuBmahLeJcdt0axcviNCtJzSO6WuwU+qVW7IpLtfaDuVSuQYWJ0OH/7lwSqbqWKtfPn4P6Vd7p57ORlUuZxaOz964JnErrO3J2Ga6vTY9oaFjl6/DrbvZxw0Ov/h7B4WD0oATLdSINqb3CZFbQ6MtRsZiX9VRD0zUMIkOpOavC/p7m5RprVV8LOFDlKa3GmiKsMRxlqrDJbN1cBjhuy3MNF4uZE+QL1tzXDEUUWatUX2aNDIESImF9zLlyyUZj867M09GJRUUXpmlYjUSZ6BrrYxLa8XKfqZf8SlOk4fgzDBubpWRsnKzphFUmF1Us12Y1Tprqqs1AGWBJBGpa5DPnVBL2suxxDBMYpuFYbioNadzG3NHK/xEXhy2m932/j6/HriPLF0XY6Jg+tIPAgxrL+709vJZLx/VdC8ksTCutPO8c+TS7NEM+xiwLLEpZGB/2mRzsu8Capi36E30ZqvVtBxkJJ+xhSnYViaFEmzijxhkzYkx9K4chs3wyP3Tb0zDqqip1IrMQiVCIIiMOrUb82VIA+3oQOjYglmw7Kuh6jkrLpMp44ETV7pBp5RxLkwSKbth+FM1wPgubI8RFS8AUvjcbuCAEZwIJvBAuKYJZkDyEhojBVnXj4YbVGLkRHHNMex1JrdjKlMIM8sGAwWN0v008iVeGnL2OCDOgQOZmjFewPfSs9BsOZnOeFqqk2lpQBrWhGlrI+aIxLSkPqAzfUuGBdNnSLJIXdMb5qkLb0Bo2ooTMhN7lzrNZ68BnypYd0FhmsqFtRWW24DFhAgNetpCXNdfzLZnBZWRBEISST8CE2avaRNN3C1omJ9ao8B0or9iZJskmiKNYGysleUn3s2oYrc8kYxqmebiEc/jGk/H/O4mc80jcBKB901VYuRPyjs2E2uDyiR7hSLT9QXthV7N7bcjefaTzucBep6Wz6gMwXHVebjC00ZStlSV/9wjp1fMjx1nKARenJKJK+1suUWejwt3/wppKyhEhI4T+77yqgIFSUyVJ1Sjb0FQA3b5rzg7L88NCLJMPIpPRytCrJGNVQSLKNiISIStGXUTfkHNyU7G5np3JqMiX3nFHAs8lQDuRza61gpxcH6xDXQHH1RaoAB26b4lcO4QWrsvNOzdrdoGzA1vrwTawFnSUOUBI28G689w2iIOeV66xJ17BhUZjisURbTobsoz3SytIQOueOY3YdYTLChzmS8lho19uSITMDnVqkIo3dO77aw4XEaufTO5bIZ66nQ4QYV65gISQUsk0XdCo7TH9NOsUe7trVnUeqXJkPIfnurb8XXTXUsJwOEoZIhKS7oXfH1NyWmisU7La362qV8DQ91YmhlBhktr6yTIpozdCec+0QaWRMFvEure89ktbf0kjj00RA6QnS2ttCy/5aBGyFT5X4owUpfZP3JZZRH0LXuplwCJkprruwLhJ3HxS8xSJgMHpm1J0MJ1LJo8PBYp4RzWfedxhyZHfEJk5jCzviCFe03rj3bnDPH8S8xMP4+FDcXoXrLMs9ZrfCeultK/Hn07PzZ0Yurth+X+KW3Fb/wJT+mKOK2Fl7MEYk61oL1zcm5jJvLdlbLLqow1Cf6wJKBsnQ0p2tOoaPlihJVYt6ldTHxZa9Q+p5cJBkQui7lSmKfo/3vMSGC8+7q8KcdY09s/KXMsV6xJJW5BD8sVMSNlF59g/ONpkH+vn5bC1+ky1WdZL2D69tb1eUmutMuQL2ZJCKC2Sty7BE00GtmIUqLiSykEGLW9BY58WkZDCRWkxrOT4YgJcq9fahtBFAmfZNJ8/7Kajh/3hXqh0Xnz5i4DxFg1P/keLVOvT3Z3n0BgDWQy6j+O2HaCI0oHSAaYSOEEW5g40pT/NTSeH20gHnLreQ/iVF75uf+3lgaceFdcC4CrNs+1sN7tnKojg/1rAZGylB/vAmnyvDRLo0JiKr0gRGgYyspksv6NdZJDWu/RZ/SjP8peXhG4/AUn4BEeDadjlu62Q9a8xAXZYobGDmH3+fLjuYPX0ow4goLv/7VKBXIyKtUPmTtrWQP+nTup+cCJqUCp9szEXPxNrjd069qH3qGp7GsJVCLgR6FSiz4yqS6oz7G3MUaV3PhwN7+Uyff2D8XHXP/DdwxJVOG4kOCeEs+Dtff36ZZseJmDHURApQbarz2ahE0VOoYPXl/jfKkUt3t3ZX9I5Ix86KtH11JZX7IwmrvU4zjde7PlonYbbpJ2buyv/2cX/t/vbqbSe9VdsrfRkFzZ/c27QHcdnzburB0Zbz/K8Tq6YzpIdxls6TrdsqlRxGD0aY7t5Gy7olwiaVNOh31OW2G/gsuzCLm6pFIIkDMxc/g2ECVWTgU8C8wZBF11n9isXgrZXWyzZJL1QuQiCXWEOMvVblaw10HTP+EXA7Le/UC3LMpWWPbRMO8hXu/20zh/7gW+rIum+MqqAJKz/W7fdfK2sFmKjAQecjwbjyN52ny24Zyezpsa4trevE+dte20+H7a3vI9dZAXhEpcaXw+ZQCAnxJmTBudr+oEHVC5fD9wR8nnxZ/P7nQLQRz/aGpYhRUJj8+v2YWeMzXYYmwinxDveyrdegMkRebugkjN9reUqfqg3qEMB290E/r219Vh428Mwa3cmxLO6sJH4zqbz1EoC9mpmQXtvjBl3Xt4bOfBcAsiJCWEpIaEEhq1+HRkY4X86SH74gvlvbeSBKMF2KUK36U268nF0iQghbr/V7Ogmj9tgUN/fb2pzXZGnWBMgpriY89BhZCkgTTVvZWgivEymhfeqYgD7KvR3/EzLsv1zHej5nuIb6JHJ+laoUu8MMooxBEamoBhOnS6HjFGNyAh7sn0r+voKfjCOToQXAy805Cwiics+rSQYovAgtwboTJFsk77rK5EjP8tNtjoe/tB9LaUSU3+3ByBtdaByXpzneUCRIsOtGA9bLfPqufh+AmRQt96lKJVjMADeD3K3AFX9vpZCkFi5O90JvMab6nX7nDmX3dFHJn1Wblc3tlrDuCjtJ6rBKOSe9VrlWJm3XqQ0myNIspiP5ZD2zPPsX05pdlBiTZMbnADE3970ZhIGmyw1A/P9VLKbr9wo9ZZStHc4Tv88yECGpBfk3HumGEAQvjlV7EPn2dVlcDVMtNIMzHOrLpEKbGXBwh/4n+qaNZnVAO0zFAMDAJfqT+ovzaLQnMwugCTLwnDdiL6JWVtrzvQVwU+2BDcV2uAWkozBYDMvlbXeHE/MNjfHUo8Foj3z1ED/jekcQVX6v3VoWVtIQ+T0tUSM3ZQCAOxv9K+6dhaTwzeSDdcz0cM18DYj+r/cd9GmfqENDAQiy/hvd3FzXzsdrE+XWv31Mcve+KnzK+Ux/LDzxYUcsG6nmDhCdLsAb8KQ/F8P1tUPKdaZNBHAnGbNQfuJoa5MCMNQsBNWwgKYUqInGclytucXZWVZodAjWNTIgTy0Nz3oEmJcYb5PyfYNtu0gFKSlYj34RpaDi5WKQpspRdpzMkgRlKEpOqkg+6Cr67XBEqyAsD7wT4t94aqkULXKNg2KVHjVMPrRxpOMC6pwzdgcbLWkE8xVEX1gUg0F1pYYmvufaBcQBBkkrHZxUv3lXDzo87nJQINVGi07yVgqkQoFEbAJyiGnJP5dC2b4xOeiOFBr9YwWT+eMh90X7xoAkGu9nrP9dUiaakN7C7UUqG/4UrjCy2IMkzmM6LZgMNG6D1SBqIVaCuSjrhpn5uT1mlhesTay053O/t1C1VLSsfcjR3Q5PEehPD9ZlJYS3X6OjQnsvpcTdYneF/6Gl95Lefut1VvBk0PMmRSkmqXQrOUmmcZ7rOXZfmkN8XheDrYLUYPNce56/I91mfvHBJa+WVqDtbnaq8P04JZAIIaAzVBeWm1umh8y5DGcX+lDp0j/3NeyRjZr3JENTV9N+G52q72VYyhIkFIOd/8bIGzbWumDsPfbZX6lE6kp+6d2tICkViv1Wy/yItvFRCxxM+xFVUGKc8dX616niLUWF7ZLYxWgf1CQL3he1nXNIPLj3nW9xEu7F20681zfd4l64bUEeX57LRDQLVgNQ+WLuQm43MS8xrkI19zQRJNX+ztJUdqUsGIWkQ59S1xkPvNZduHA7wTxrlxqJ/KDVh60XtbeU3C0XC70PAsshEZ/YX5fAlFN/KEyojuvPbJF1hmdHT3NFuw9Ycok+twY/fW43+LU2tmLqX0nwIinQ3wZkRodIz5H54jw+CzoJGUN0nF6A/6blzaAAOApy667bL/gdJn1HwFBtAKAhuceagCApmfrduOXm7eluQNGwwAAEPi8mcatCfm/GC44/Ar7j2M0b7mgrNuGEcrzfGe+wm/QpW7WC/w+vKFd/Iirc1jS5NN5uQJm2kTJdbjuzEFNPc4vQt7TGJMa9Sbyyc+d3cD1O7i3wqO9hUevgPg+Kdmh2wwY7zgaH4anIQJTyzu8HMEgj3d20QNM7RSceUhQHzSsfcgLRbKNf69jrp1JC238K03nNuCXpFFp3WVI2JlRJja2Y4Pa39IewVHSqT1Beg8Qwy/7TkGJMOUfmubps1l47XxHZIU8GC+Wi0Ng9XAX0I0hGhH4j+eJ/FBbDxktkBcMye8y+lFYWxMyO8itbfSd5tgeLk0ILIuxk4KbNKYpfoACRjhCD0NNOPzLGZdHGFPPKatJMoMoq6icuaSZQB4XYRbQpItzDoYiBWEIaQzJrAhEIghJbKr7+6nJdo5pdLyBQio+eZxVjpDMGAiflIejgMjo71r4czrwQ+cTkzJQs0YN7z7Y3SSaG51zyYAOFK823X+iu1l2PjZu1LLLI8OlIyLzs4Qa0Tk2SPkJ2hj4xjj8FEkZ2yCFs4+F9iwBTW4XDYVKIT9lMKscdtSIY2bH4iyzwIe1NPYJ7Vc8ssOwVpLUSgO6XtY4bXI+VxahdfmZGjx5DWuHxGb0avPDRj3HbiRo01n5Y/g6nRcjaXpAhECYMBfy6X1F5RXWTljbjO0usd0tBsA2xoHm2w58iuAoDh7cdsBO7DdPQiuDMdOQo7YlwykOo6MJ8UoHoeXLqfnFpJQBAmheWRhjUJB9k+B7bNJ40tkI7aq1r+sgCXGqSsLExUUixOYzieSTwxIlNDMSzSNkP6nA1A6DCBCHlUhw0ipRoHZfp/XYQWJA64IkAL3NkhBUKiUWHGRKIlAaIImBFa9JEFCQpCDWS5KBnFaSE+C4Vf1uABLM9RJxDFZBWWR/4SmFjfC4j+WwyzYRrkmkBWN6iNtWxxWxxVjKg4L2EMQsWQVJwDTHThBwWAkZWO0wBPElzlpShBDKiDy7KPryFcIShmw4t/xTg4QlnEZq03wZaugZCXfjA3dgJkwUh6cwR2p+aMILnangNPFogqRPSE5CiUbF0VIrMugW8qnAUw/3XkM6IXALwTiCqDQ8M9TVNVbCKUSJatarn6V12wdm4lASCoOC2QYrCZdg5BGGMihEQajMrRcwOCSlf66jkIbQoEscuJQVsn2ZUTVV4V4PZ0oiJa/8wgvuEx8sG+KZ7H+JaF4ALn4NhjsynTBetdVcGWQxamOS7Re/+Z2bXtx5+MOf7rr3qWvfva8cZvc9MMEja5x0ip/X/D+PbW2PPTHRUyFC66JwHSKcInjKm5tsqjy7JUg0TZJ2yaYbxD3ji+7f7Zl8s83JcijQP0Wf4vbNp5prkHmKFCu0R4nTBus05McM2JYsXKpchbLPe/vOLC4bmxWIRgxcc90OOyk+Vy79VLbv3ZYuFCRELBIhMZIgKZIheSpTlerUZFVq+S9x6tOQxjSFHkaYaQ4r7HDCDS98V3T7oCeGCCOKOJJIEfGIPIooo2JFxo7eMaR9nOx1M74Wk6BxosidcVYsEbE0GSJFq3PLOeddcNERR9W6isJyJlRlkWWWWm5+zIGka7XAz5j4W2hjAkh1eaOGA0f21hlnv5joCRIUY0wxxxJrbLHHEThI0GBxBo8r7njiDRFfyPitFGeFeg2e+0sjsTUiMuWqRMinRSVrNumGXIegJGRYrh7VgPqPJPBZoV81rQpXg9RRPB+/cXr4m0IqVgv9fEjC/OSa1OZC7uRnUsKMfOtJmLVxiKNHVMEnQdfClBwDBdCjlFA9QsmUUCIDlACh9lNC7SsBJWCn8HnSAcgxAAEKQAmQKQECAGRKgVACBAiQKZgqP4mMalZfkwV1Rwgt1E9SUQBBMroKFKlvKkW91cnTD6w0pG/WSWolr1qeBX+UpjP43Sw1/19/QVLMSKp1OcviwWwn9+aeIwDfn5II81MqIw0UTVVFY6sNrdz6Burv41xT+auWSyJYcvkOFRsaVl9fDYlwYskOVYKhacZqgX7MLCZRLcDq06LRja3N0paU6pSaPzQTNOTGZcq/YWZUgRbXGB4T/9tbAQA=";

// src/ssr/fonts/PlayfairDisplay-latin.woff2
var PlayfairDisplay_latin_default = "data:font/woff2;base64,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";

// src/ssr/fonts/PlayfairDisplay-italic-latin.woff2
var PlayfairDisplay_italic_latin_default = "data:font/woff2;base64,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";

// src/ssr/renderSlideHtml.tsx
var import_jsx_runtime14 = __toESM(require_jsx_runtime(), 1);
var SLIDE_WIDTH = 420;
var SLIDE_HEIGHT = 525;
var DOCUMENT_CSS = `
@font-face{font-family:'Plus Jakarta Sans';src:url(${PlusJakartaSans_latin_default}) format('woff2');font-weight:200 800;font-style:normal;font-display:block}
@font-face{font-family:'Plus Jakarta Sans';src:url(${PlusJakartaSans_italic_latin_default}) format('woff2');font-weight:200 800;font-style:italic;font-display:block}
@font-face{font-family:'Playfair Display';src:url(${PlayfairDisplay_latin_default}) format('woff2');font-weight:400 900;font-style:normal;font-display:block}
@font-face{font-family:'Playfair Display';src:url(${PlayfairDisplay_italic_latin_default}) format('woff2');font-weight:400 900;font-style:italic;font-display:block}
:root{--font-heading:'Playfair Display',Georgia,serif}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent}
body{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
`;
function renderSlideHtml(params) {
  const { slide, index, total, colors, brandName, handle, designPreset } = params;
  const markup = (0, import_server.renderToStaticMarkup)(
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
      IGSlide,
      {
        slide,
        index,
        total,
        colors,
        isLast: index === total - 1,
        brandName,
        handle,
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        designPreset
      }
    )
  );
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>${DOCUMENT_CSS}</style></head><body><div style="width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;overflow:hidden">${markup}</div></body></html>`;
}
export {
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  renderSlideHtml
};
