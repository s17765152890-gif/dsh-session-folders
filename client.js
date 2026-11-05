window.__ModuleLoader__.load({
  id: 'dsh-session-folders',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'session-cwd-opener';
    let primitives = null;
    try {
      primitives = require('@deepseek-ai/dsh-client-ui-primitives');
    } catch (e) {
      primitives = null;
    }
    try {
      window.__sessionCwdOpener = { version: '0.1.0' };
    } catch (e) {}

    const zh = {
      'openDir': '打开工作目录',
      'openInManager': '在文件管理器中打开',
      'hint': '点击在文件管理器中打开',
      'failed': '打开失败，请重试',
      'workingDir': '工作目录',
      'colorTitle': '文件夹颜色',
      'noWorkspace': '该会话暂无所属文件夹，无法标色',
      'filterTitle': '按颜色筛选',
      'showAll': '全部显示',
      'refresh': '刷新列表',
      'settingsTitle': '文件夹颜色',
      'settingsDesc': '给工作区文件夹标色，并给每种颜色起别名。设色入口在每条会话的 ... 菜单里；筛选按钮在侧边栏底部。',
      'alias': '别名',
      'addColor': '添加颜色',
      'delete': '删除',
      'reset': '恢复默认 8 色',
      'inUse': '个文件夹在用',
      'needRestart': '工作区列表不可用，请重启 DSH 后再试',
    };
    const en = {
      'openDir': 'Open working directory',
      'openInManager': 'Open in file manager',
      'hint': 'Click to open in file manager',
      'failed': 'Could not open. Try again.',
      'workingDir': 'Working directory',
      'colorTitle': 'Folder color',
      'noWorkspace': 'This session has no workspace folder to color',
      'filterTitle': 'Filter by color',
      'showAll': 'Show all',
      'refresh': 'Refresh',
      'settingsTitle': 'Folder colors',
      'settingsDesc': 'Color workspace folders and rename color aliases. Set a color from any session ... menu; filter from the palette button at the sidebar foot.',
      'alias': 'Alias',
      'addColor': 'Add color',
      'delete': 'Delete',
      'reset': 'Reset to 8 defaults',
      'inUse': 'folders use it',
      'needRestart': 'Workspace list unavailable, restart DSH and try again',
    };

    const DEFAULT_PALETTE = [
      { id: 'red', name: '红色', hex: '#F2555A' },
      { id: 'orange', name: '橙色', hex: '#F79009' },
      { id: 'yellow', name: '黄色', hex: '#FAC905' },
      { id: 'green', name: '绿色', hex: '#3FB950' },
      { id: 'blue', name: '蓝色', hex: '#4493F8' },
      { id: 'purple', name: '紫色', hex: '#A371F7' },
      { id: 'pink', name: '粉色', hex: '#F778BA' },
      { id: 'gray', name: '灰色', hex: '#8B949E' },
    ];
    const STORE_KEY = 'session-cwd-opener:v1';

    function defaultStore() {
      return {
        palette: DEFAULT_PALETTE.map((c) => ({ ...c })),
        colors: {},
        filter: [],
      };
    }
    function loadStore() {
      try {
        const raw = window.localStorage.getItem(STORE_KEY);
        if (!raw) return defaultStore();
        const parsed = JSON.parse(raw);
        const palette = Array.isArray(parsed.palette) && parsed.palette.length > 0
          ? parsed.palette.filter((c) => c && typeof c.id === 'string' && typeof c.hex === 'string')
            .map((c) => ({ id: c.id, name: typeof c.name === 'string' ? c.name : c.id, hex: c.hex }))
          : defaultStore().palette;
        const colors = parsed.colors && typeof parsed.colors === 'object' ? parsed.colors : {};
        const filter = Array.isArray(parsed.filter) ? parsed.filter.filter((v) => typeof v === 'string') : [];
        return { palette, colors, filter };
      } catch (e) {
        return defaultStore();
      }
    }
    let storeState = loadStore();
    const storeListeners = new Set();
    function getStore() {
      return storeState;
    }
    function setStore(patch) {
      storeState = { ...storeState, ...patch };
      try {
        window.localStorage.setItem(STORE_KEY, JSON.stringify(storeState));
      } catch (e) {}
      storeListeners.forEach((fn) => {
        try {
          fn();
        } catch (e) {}
      });
    }
    function subscribeStore(fn) {
      storeListeners.add(fn);
      return () => {
        storeListeners.delete(fn);
      };
    }
    function useStoreSel(sel) {
      const get = React.useCallback(() => sel(getStore()), [sel]);
      let value;
      try {
        value = React.useSyncExternalStore(subscribeStore, get, get);
      } catch (e) {
        value = get();
      }
      return value;
    }
    // Colors are keyed by workspace PATH (stable for the user) with a
    // fallback to legacy workspace-id keys, so old settings keep working.
    function colorIdForWs(w) {
      if (!w) return undefined;
      const colors = getStore().colors || {};
      if (w.path && colors[w.path]) return colors[w.path];
      if (w.id && colors[w.id]) return colors[w.id];
      return undefined;
    }
    function setWorkspaceColor(ws, colorId) {
      if (!ws) return;
      const colors = { ...getStore().colors };
      const prev = (ws.path && colors[ws.path]) || (ws.id && colors[ws.id]);
      delete colors[ws.id];
      if (ws.path) delete colors[ws.path];
      if (colorId && prev !== colorId && ws.path) colors[ws.path] = colorId;
      else if (colorId && prev !== colorId && ws.id) colors[ws.id] = colorId;
      setStore({ colors });
    }
    function toggleFilter(colorId) {
      const filter = getStore().filter.slice();
      const i = filter.indexOf(colorId);
      if (i >= 0) filter.splice(i, 1);
      else filter.push(colorId);
      setStore({ filter });
    }

    function sessionIdOf(props) {
      if (!props || typeof props !== 'object') return undefined;
      if (typeof props.sessionId === 'string' && props.sessionId) return props.sessionId;
      if (typeof props.sessionID === 'string' && props.sessionID) return props.sessionID;
      if (props.node && typeof props.node.id === 'string' && props.node.id) return props.node.id;
      for (const key of Object.keys(props)) {
        if (/session.*id/i.test(key) && typeof props[key] === 'string' && props[key]) return props[key];
      }
      return undefined;
    }

    function FolderIcon(props) {
      const s = props && typeof props.size === 'number' ? props.size : 13;
      return h(
        'svg',
        {
          width: s,
          height: s,
          viewBox: '0 0 16 16',
          fill: 'none',
          'aria-hidden': true,
          style: { flex: 'none', display: 'block' },
        },
        h('path', {
          d: 'M1.5 3.6c0-.9.7-1.6 1.6-1.6h2.5l1.4 1.7h5.4c.9 0 1.6.7 1.6 1.6v4.9c0 .9-.7 1.6-1.6 1.6H3.1c-.9 0-1.6-.7-1.6-1.6V3.6z',
          stroke: 'currentColor',
          strokeWidth: 1.2,
          strokeLinejoin: 'round',
        }),
      );
    }

    function ColorDot(props) {
      const size = props && typeof props.size === 'number' ? props.size : 10;
      return h('span', {
        'aria-hidden': true,
        style: {
          width: size,
          height: size,
          borderRadius: '50%',
          background: props.hex,
          flex: 'none',
          display: 'inline-block',
          boxSizing: 'border-box',
          border: '1px solid rgba(128,128,128,.45)',
        },
      });
    }

    function PaletteGlyph(props) {
      const s = props && typeof props.size === 'number' ? props.size : 15;
      return h(
        'svg',
        { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': true, style: { display: 'block' } },
        h('circle', { cx: 5, cy: 6, r: 2.1, fill: '#F2555A' }),
        h('circle', { cx: 10.5, cy: 5, r: 2.1, fill: '#FAC905' }),
        h('circle', { cx: 4.5, cy: 11, r: 2.1, fill: '#3FB950' }),
        h('circle', { cx: 10, cy: 10.5, r: 2.1, fill: '#4493F8' }),
      );
    }

    return {
      inject: ['sessions', 'slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'session-cwd-opener: dictionaries');
        const t = ctx.locale.bind(NS);

        // ---------- session helpers ----------
        function readCwd(sessionId) {
          if (!sessionId) return undefined;
          try {
            const snap = ctx.sessions && ctx.sessions.list && ctx.sessions.list.getSnapshot
              ? ctx.sessions.list.getSnapshot()
              : undefined;
            const row = snap && snap.byId ? snap.byId[sessionId] : undefined;
            const cwd = row ? row.cwd : undefined;
            if (typeof cwd === 'string' && cwd) return cwd;
          } catch (e) {}
          return undefined;
        }
        function readSessionsSnap() {
          try {
            const snap = ctx.sessions && ctx.sessions.list && ctx.sessions.list.getSnapshot
              ? ctx.sessions.list.getSnapshot()
              : undefined;
            return snap && snap.byId ? snap : { byId: {}, ids: [] };
          } catch (e) {
            return { byId: {}, ids: [] };
          }
        }
        function currentSessionId() {
          try {
            const snap = readSessionsSnap();
            const rows = Object.values(snap.byId || {});
            const cur = rows.find((r) => r && ((r.retainedBy && r.retainedBy.mainView) || 0) > 0);
            return cur && cur.id ? cur.id : undefined;
          } catch (e) {
            return undefined;
          }
        }
        function subscribeSessions(listener) {
          try {
            const list = ctx.sessions && ctx.sessions.list;
            if (list && typeof list.subscribe === 'function') return list.subscribe(listener);
          } catch (e) {}
          return () => {};
        }
        function useCwd(sessionId) {
          const get = React.useCallback(() => readCwd(sessionId), [sessionId]);
          const sub = React.useCallback((fn) => subscribeSessions(fn), []);
          let value;
          try {
            value = React.useSyncExternalStore(sub, get, get);
          } catch (e) {
            value = get();
          }
          return value;
        }
        function useSessionsTick() {
          const get = React.useCallback(() => {
            try {
              const snap = readSessionsSnap();
              return (snap.ids || []).join(',') + '|' + Object.keys(snap.byId || {}).length;
            } catch (e) {
              return '';
            }
          }, []);
          const sub = React.useCallback((fn) => subscribeSessions(fn), []);
          let value;
          try {
            value = React.useSyncExternalStore(sub, get, get);
          } catch (e) {
            value = get();
          }
          return value;
        }

        async function openCwd(path) {
          try {
            const r = await fetch('open-in-app/apps', { headers: { accept: 'application/json' } });
            if (r.ok) {
              const payload = await r.json();
              const apps = Array.isArray(payload.apps) ? payload.apps.filter((v) => typeof v === 'string') : [];
              const pick =
                ['explorer', 'finder', 'filemanager'].find((a) => apps.indexOf(a) >= 0) || apps[0];
              if (pick) {
                const ro = await fetch('open-in-app/open', {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ app: pick, path }),
                });
                if (ro.ok) return { ok: true };
              }
            }
          } catch (e) {}
          try {
            const r2 = await fetch('session-cwd-opener/open', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ path }),
            });
            if (r2.ok) return { ok: true };
          } catch (e) {}
          return { ok: false };
        }
        function useOpener(cwd) {
          const [busy, setBusy] = React.useState(false);
          const [failed, setFailed] = React.useState(false);
          const run = React.useCallback(
            (e) => {
              if (e) {
                e.stopPropagation();
                if (e.preventDefault) e.preventDefault();
              }
              if (!cwd || busy) return;
              setBusy(true);
              setFailed(false);
              openCwd(cwd).then((r) => {
                setBusy(false);
                setFailed(!r.ok);
              });
            },
            [cwd, busy],
          );
          return { busy, failed, run };
        }

        // ---------- workspaces (via Host route) ----------
        const wsCache = { status: 'idle', data: [] };
        const wsListeners = new Set();
        function emitWs() {
          wsListeners.forEach((fn) => {
            try {
              fn();
            } catch (e) {}
          });
        }
        let wsInflight = null;
        async function refreshWorkspaces() {
          if (wsInflight) return wsInflight;
          wsInflight = (async () => {
            try {
              const r = await fetch('session-cwd-opener/workspaces', { headers: { accept: 'application/json' } });
              if (r.ok) {
                const payload = await r.json();
                if (Array.isArray(payload.workspaces)) {
                  wsCache.status = 'ready';
                  wsCache.data = payload.workspaces;
                  emitWs();
                  return;
                }
              }
              wsCache.status = 'error';
              emitWs();
            } catch (e) {
              wsCache.status = 'error';
              emitWs();
            } finally {
              wsInflight = null;
            }
          })();
          return wsInflight;
        }
        function subscribeWs(fn) {
          wsListeners.add(fn);
          return () => {
            wsListeners.delete(fn);
          };
        }
        function useWorkspaces() {
          const get = React.useCallback(() => wsCache.status + ':' + wsCache.data.length, []);
          try {
            React.useSyncExternalStore(subscribeWs, get, get);
          } catch (e) {}
          return wsCache;
        }
        function workspaceOfSession(sessionId, cwd) {
          const data = wsCache.data || [];
          for (const w of data) {
            if (w.sessionIds && w.sessionIds.indexOf(sessionId) >= 0) return w;
          }
          if (cwd) {
            for (const w of data) {
              if (w.path === cwd) return w;
            }
          }
          return undefined;
        }

        // ---------- generated CSS: recolor + selected-text migration + filter ----------
        function escAttr(v) {
          try {
            if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(v);
          } catch (e) {}
          return String(v).replace(/["\\]/g, '\\$&');
        }
        const ACCENT = 'var(--dsw-alias-state-business-primary, var(--dsw-alias-label-primary))';
        function buildCss() {
          const st = getStore();
          const byId = {};
          st.palette.forEach((c) => {
            byId[c.id] = c;
          });
          const rules = [];
          const wsData = wsCache.data || [];
          // Observe the REAL sidebar structure: walk rows in document order and
          // assign each session row to its nearest preceding workspace header.
          // Key-agnostic: works no matter how the host names group keys.
          const headerMap = (function observeHeaderMapping() {
            const map = {};
            let els = [];
            try {
              els = document.querySelectorAll('[data-row-key^="workspace:"],[data-row-key^="session:"]');
            } catch (e) {
              return map;
            }
            let curHeader = null;
            for (let i = 0; i < els.length; i++) {
              let k = null;
              try {
                k = els[i].getAttribute('data-row-key');
              } catch (err) {
                k = null;
              }
              if (!k) continue;
              if (k.indexOf('workspace:') === 0) {
                curHeader = k;
                if (!map[curHeader]) map[curHeader] = { sessions: [] };
              } else if (curHeader && k.indexOf('session:') === 0) {
                map[curHeader].sessions.push(k.slice(8));
              }
            }
            return map;
          })();
          // Identify each observed header by majority vote of its member
          // sessions against the API membership; fall back to matching the
          // header key itself against a workspace id or path.
          const apiBySession = {};
          wsData.forEach((w) => {
            (w.sessionIds || []).forEach((sid) => {
              if (!apiBySession[sid]) apiBySession[sid] = [];
              apiBySession[sid].push(w);
            });
          });
          const headerWs = {};
          Object.keys(headerMap).forEach((hk) => {
            const votes = {};
            const order = [];
            headerMap[hk].sessions.forEach((sid) => {
              (apiBySession[sid] || []).forEach((w) => {
                const k = w.path || w.id;
                if (!votes[k]) {
                  votes[k] = { n: 0, w };
                  order.push(k);
                }
                votes[k].n += 1;
              });
            });
            let best = null;
            order.forEach((k) => {
              if (!best || votes[k].n > votes[best].n) best = k;
            });
            if (best) {
              headerWs[hk] = votes[best].w;
            } else {
              const tail = hk.slice(10);
              const w = wsData.find((x) => x.id === tail || x.path === tail);
              if (w) headerWs[hk] = w;
            }
          });
          const hexForWs = (w) => {
            if (!w) return null;
            const colors = getStore().colors || {};
            const cid = (w.path && colors[w.path]) || (w.id && colors[w.id]);
            const c = cid && byId[cid];
            return c ? { hex: c.hex, id: c.id } : null;
          };
          // 1) folder recolor on OBSERVED header rows (never by assumed keys)
          Object.keys(headerWs).forEach((hk) => {
            const hit = hexForWs(headerWs[hk]);
            if (!hit) return;
            const sel = '[data-row-key="' + escAttr(hk) + '"]';
            rules.push(
              // folder icon itself (works when the icon inherits currentColor)
              sel + ' > span:first-child{color:' + hit.hex + ' !important;}',
              // whole folder row gets a colored edge + tint so the color is
              // always visible even if the host icon ignores `color`
              sel + '{box-shadow: inset 4px 0 0 ' + hit.hex + ' !important;background: color-mix(in srgb, ' + hit.hex + ' 24%, transparent) !important;}',
              // folder label text always wears the custom color (the later
              // selected-state rule upgrades it to the theme accent)
              sel + ' > span:nth-child(3), ' + sel + ' > span:nth-child(3) span{color:' + hit.hex + ' !important;}',
            );
          });
          const snap = readSessionsSnap();
          const cur = currentSessionId();
          let curHeader = null;
          if (cur) {
            Object.keys(headerMap).forEach((hk) => {
              if (headerMap[hk].sessions.indexOf(cur) >= 0) curHeader = hk;
            });
          }
          // 2) selected-state text highlight migration (folder keeps custom color)
          if (curHeader) {
            rules.push(
              '[data-row-key="workspace:' + escAttr(curHeader) + '"] > span:nth-child(3), ' +
              '[data-row-key="workspace:' + escAttr(curHeader) + '"] > span:nth-child(3) span{color:' + ACCENT + ' !important;}',
            );
          }
          if (cur && snap.byId && snap.byId[cur] && !snap.byId[cur].blank) {
            rules.push(
              '[data-row-key="session:' + escAttr(cur) + '"] > span:nth-child(2){color:' + ACCENT + ' !important;}',
            );
          }
          // 3) color filter (only once the workspace map is loaded;
          // a missing map must never hide rows)
          const filter = (st.filter || []).filter((id) => byId[id]);
          if (filter.length > 0 && wsCache.status === 'ready') {
            const showHeaders = new Set();
            const showSessions = new Set();
            Object.keys(headerWs).forEach((hk) => {
              const hitH = hexForWs(headerWs[hk]);
              if (hitH && filter.indexOf(hitH.id) >= 0) {
                showHeaders.add(hk);
                (headerMap[hk].sessions || []).forEach((id) => showSessions.add(id));
              }
            });
            wsData.forEach((w) => {
              const hitW = hexForWs(w);
              if (hitW && filter.indexOf(hitW.id) >= 0) {
                (w.sessionIds || []).forEach((id) => showSessions.add(id));
              }
            });
            if (cur) showSessions.add(cur);
            if (curHeader) showHeaders.add(curHeader);
            // keep blank (new-session placeholder) rows visible
            Object.keys(snap.byId || {}).forEach((id) => {
              if (snap.byId[id] && snap.byId[id].blank) showSessions.add(id);
            });
            const hideHeaders = Object.keys(headerMap).filter((hk) => !showHeaders.has(hk));
            if (hideHeaders.length > 0) {
              rules.push(
                hideHeaders.map((hk) => '[data-row-key="' + escAttr(hk) + '"]').join(',') +
                '{display:none !important;}'
              );
            }
            const hideSessions = Object.keys(snap.byId || {}).filter((id) => !showSessions.has(id));
            if (hideSessions.length > 0) {
              const chunks = [];
              for (let i = 0; i < hideSessions.length; i += 60) {
                chunks.push(
                  hideSessions.slice(i, i + 60).map((id) => '[data-row-key="session:' + escAttr(id) + '"]').join(',') +
                  '{display:none !important;}',
                );
              }
              rules.push(...chunks);
            }
          }
          return rules.join('\n');
        }

        const hoverStyle = {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 0,
          width: '100%',
          marginTop: 6,
          padding: '5px 7px',
          borderRadius: 6,
          border: '1px solid var(--dsw-alias-border-l4)',
          background: 'var(--dsw-alias-interactive-bg-hover)',
          color: 'var(--dsw-alias-label-secondary)',
          fontSize: 11,
          lineHeight: '15px',
          cursor: 'pointer',
          textAlign: 'left',
        };

        // ---- 1. Hover card ----
        function SidebarHoverCwd(props) {
          const sessionId = sessionIdOf(props);
          const cwd = useCwd(sessionId);
          const { busy, failed, run } = useOpener(cwd);
          const wsColorHex = useStoreSel((st) => {
            const ws = workspaceOfSession(sessionId, cwd);
            if (!ws) return null;
            const c = (st.palette || []).find((x) => x.id === (st.colors || {})[ws.id]);
            return c ? c.hex : null;
          });
          if (!sessionId || !cwd) return null;
          return h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
            h(
              'button',
              {
                type: 'button',
                title: cwd + '\n' + t('hint'),
                'aria-label': t('openInManager') + ': ' + cwd,
                onClick: run,
                style: Object.assign({}, hoverStyle, { opacity: busy ? 0.6 : 1 }),
              },
              wsColorHex ? h(ColorDot, { hex: wsColorHex, size: 9 }) : h(FolderIcon, { size: 13 }),
              h(
                'span',
                {
                  style: {
                    minWidth: 0,
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    direction: 'ltr',
                  },
                },
                cwd,
              ),
            ),
            failed &&
              h(
                'div',
                { style: { fontSize: 11, color: 'var(--dsw-alias-state-error-primary)' } },
                t('failed'),
              ),
          );
        }

        // ---- 2. Session "..." menu: path + open + folder color ----
        function OpenMenuButtonInner({ cwd, closeMenu }) {
          const { busy, failed, run } = useOpener(cwd);
          const doSelect = () => {
            try {
              closeMenu();
            } catch (e) {}
            run();
          };
          const MenuItemButton = primitives && primitives.MenuItemButton;
          const HostIcon =
            (primitives && (primitives.IconFolderOpenOutlineRegular || primitives.IconFolderOpenRegular)) ||
            null;
          if (MenuItemButton) {
            return h(
              React.Fragment,
              null,
              h(MenuItemButton, {
                icon: HostIcon ? h(HostIcon, {}) : h(FolderIcon, { size: 14 }),
                onSelect: doSelect,
                children: busy ? '…' : t('openDir'),
              }),
              failed &&
                h(
                  'div',
                  {
                    style: {
                      padding: '2px 10px 4px 10px',
                      fontSize: 11,
                      color: 'var(--dsw-alias-state-error-primary)',
                    },
                  },
                  t('failed'),
                ),
            );
          }
          return h(
            'button',
            {
              type: 'button',
              onClick: run,
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                boxSizing: 'border-box',
                padding: '6px 10px',
                fontSize: 12,
                lineHeight: '18px',
                border: 0,
                background: 'transparent',
                color: 'var(--dsw-alias-label-primary)',
                cursor: busy ? 'default' : 'pointer',
                textAlign: 'left',
              },
            },
            h(FolderIcon, { size: 14 }),
            h('span', { style: { opacity: busy ? 0.55 : 1 } }, busy ? '…' : t('openDir')),
          );
        }
        function OpenMenuButtonWithHook({ cwd, useMenuOpenState }) {
          const [, setMenuOpen] = useMenuOpenState();
          return h(OpenMenuButtonInner, { cwd, closeMenu: () => setMenuOpen(false) });
        }
        function ColorRow({ sessionId, cwd }) {
          const palette = useStoreSel((st) => st.palette);
          const currentColorId = useStoreSel((st) => {
            const ws = workspaceOfSession(sessionId, cwd);
            if (!ws) return undefined;
            const cc = st.colors || {};
            return (ws.path && cc[ws.path]) || (ws.id && cc[ws.id]) || undefined;
          });
          const wsReady = useWorkspaces().status;
          const ws = workspaceOfSession(sessionId, cwd);
          if (!ws) {
            return h(
              'div',
              {
                style: {
                  padding: '2px 10px 4px 10px',
                  fontSize: 11,
                  color: 'var(--dsw-alias-label-secondary)',
                },
              },
              wsReady === 'ready' ? t('noWorkspace') : t('needRestart'),
            );
          }
          return h(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 7,
                padding: '4px 10px 6px 10px',
              },
              onClick: (e) => e.stopPropagation(),
            },
            h(
              'span',
              { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', marginRight: 2 } },
              t('colorTitle'),
            ),
            palette.map((c) =>
              h(
                'button',
                {
                  key: c.id,
                  type: 'button',
                  title: c.name,
                  'aria-label': c.name,
                  onClick: (e) => {
                    e.stopPropagation();
                    setWorkspaceColor(ws, c.id);
                    // if a filter is active, include the newly painted color
                    // so the row doesn't vanish from under the open menu
                    const after = getStore();
                    const cc2 = after.colors || {};
                    const painted = (ws.path && cc2[ws.path]) || (ws.id && cc2[ws.id]);
                    if (
                      painted &&
                      after.filter.length > 0 &&
                      after.filter.indexOf(painted) < 0
                    ) {
                      setStore({ filter: after.filter.concat([painted]) });
                    }
                  },
                  style: {
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: c.hex,
                    border: '1px solid rgba(128,128,128,.5)',
                    outline: currentColorId === c.id ? '2px solid ' + ACCENT : 'none',
                    outlineOffset: 1,
                    padding: 0,
                    cursor: 'pointer',
                  },
                },
              ),
            ),
          );
        }
        function SessionMenuCwd(props) {
          const sessionId = sessionIdOf(props);
          const cwd = useCwd(sessionId);
          useWorkspaces();
          if (!sessionId || !cwd) return null;
          const useMenuOpenState = props && typeof props.useMenuOpenState === 'function' ? props.useMenuOpenState : null;
          const rowBase = {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            boxSizing: 'border-box',
            padding: '6px 10px',
            fontSize: 12,
            lineHeight: '18px',
          };
          return h(
            'div',
            { style: { minWidth: 0, padding: '2px 0' }, onClick: (e) => e.stopPropagation() },
            h(
              'div',
              {
                title: cwd,
                style: Object.assign({}, rowBase, {
                  color: 'var(--dsw-alias-label-secondary)',
                  cursor: 'default',
                  alignItems: 'flex-start',
                }),
              },
              h(
                'span',
                {
                  style: {
                    minWidth: 0,
                    flex: 1,
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-all',
                    whiteSpace: 'normal',
                  },
                },
                cwd,
              ),
            ),
            useMenuOpenState
              ? h(OpenMenuButtonWithHook, { cwd, useMenuOpenState })
              : h(OpenMenuButtonInner, { cwd, closeMenu: () => {} }),
            h(ColorRow, { sessionId, cwd }),
          );
        }

        // ---- 3. Sidebar foot: color filter ----
        function FooterFilter() {
          const palette = useStoreSel((st) => st.palette);
          const filter = useStoreSel((st) => st.filter);
          const [open, setOpen] = React.useState(false);
          const [pos, setPos] = React.useState(null);
          const [, setTick] = React.useState(0);
          const btnRef = React.useRef(null);
          const panelRef = React.useRef(null);
          useSessionsTick();
          useWorkspaces();
          useStoreSel((st) => (st.colors ? Object.keys(st.colors).length : 0));
          const css = buildCss();
          React.useEffect(() => {
            const id = setInterval(() => {
              refreshWorkspaces();
              setTick((x) => x + 1);
            }, 4000);
            return () => clearInterval(id);
          }, []);
          React.useEffect(() => {
            if (!open) return undefined;
            const onDown = (e) => {
              try {
                if (panelRef.current && panelRef.current.contains(e.target)) return;
                if (btnRef.current && btnRef.current.contains(e.target)) return;
              } catch (err) {}
              setOpen(false);
            };
            const onKey = (e) => {
              if (e && e.key === 'Escape') setOpen(false);
            };
            document.addEventListener('mousedown', onDown);
            document.addEventListener('keydown', onKey);
            return () => {
              document.removeEventListener('mousedown', onDown);
              document.removeEventListener('keydown', onKey);
            };
          }, [open ]);
          const toggleOne = (id) => {
            toggleFilter(id);
          };
          return h(
            React.Fragment,
            null,
            h('style', null, css),
            h(
              'button',
              {
                type: 'button',
                title: t('filterTitle'),
                'aria-label': t('filterTitle'),
                ref: btnRef,
                onClick: (e) => {
                  e.stopPropagation();
                  try {
                    const r = btnRef.current && btnRef.current.getBoundingClientRect
                      ? btnRef.current.getBoundingClientRect()
                      : null;
                    if (r) {
                      setPos({
                        left: Math.max(8, Math.min(r.left, window.innerWidth - 260)),
                        bottom: Math.max(8, window.innerHeight - r.top + 8),
                      });
                    }
                  } catch (err) {}
                  setOpen((v) => !v);
                },
                style: {
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 28,
                  height: 28,
                  padding: 0,
                  border: 0,
                  borderRadius: 6,
                  background: 'transparent',
                  color: 'var(--dsw-alias-label-secondary)',
                  cursor: 'pointer',
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = 'var(--dsw-alias-interactive-bg-hover)';
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = 'transparent';
                },
              },
              h(PaletteGlyph, { size: 15 }),
              filter.length > 0 &&
                h('span', {
                  'aria-hidden': true,
                  style: {
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    minWidth: 14,
                    height: 14,
                    borderRadius: 7,
                    background: 'var(--dsw-alias-state-business-primary, #3E82F7)',
                    color: '#fff',
                    fontSize: 10,
                    lineHeight: '14px',
                    textAlign: 'center',
                    padding: '0 3px',
                    boxSizing: 'border-box',
                  },
                }, String(filter.length)),
            ),
            open &&
              h(
                'div',
                {
                  ref: panelRef,
                  role: 'menu',
                  'aria-label': t('filterTitle'),
                  onClick: (e) => e.stopPropagation(),
                  onMouseDown: (e) => e.stopPropagation(),
                  style: {
                    position: 'fixed',
                    zIndex: 9999,
                    left: pos && typeof pos.left === 'number' ? pos.left : 8,
                    bottom: pos && typeof pos.bottom === 'number' ? pos.bottom : 104,
                    minWidth: 150,
                    maxWidth: 210,
                    maxHeight: 'min(46vh, 340px)',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    background: 'color-mix(in srgb, var(--dsw-alias-interactive-bg-hover) 55%, transparent)',
                    backdropFilter: 'blur(20px) saturate(1.5)',
                    WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
                    border: '1px solid var(--dsw-alias-border-l4)',
                    borderRadius: 12,
                    boxShadow: '0 8px 28px rgba(0,0,0,.45)',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                  },
                },
                (palette || []).map((c) => {
                  const active = filter.indexOf(c.id) >= 0;
                  return h(
                    'button',
                    {
                      key: c.id,
                      type: 'button',
                      role: 'menuitemcheckbox',
                      'aria-checked': active,
                      title: c.name,
                      onClick: (e) => {
                        e.stopPropagation();
                        toggleOne(c.id);
                      },
                      style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '6px 10px',
                        background: active ? 'var(--dsw-alias-border-l4)' : 'transparent',
                        border: 0,
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 12,
                        lineHeight: '18px',
                        color: 'var(--dsw-alias-label-primary)',
                        textAlign: 'left',
                      },
                    },
                    h(ColorDot, { hex: c.hex, size: 10 }),
                    h('span', { style: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.name),
                    active && h('span', { 'aria-hidden': true, style: { color: ACCENT, fontWeight: 700 } }, '✓'),
                  );
                }),
                h('div', { style: { height: 1, background: 'var(--dsw-alias-border-l4)', margin: '4px 2px' } }),
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: (e) => {
                      e.stopPropagation();
                      setStore({ filter: [] });
                      setOpen(false);
                    },
                    style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'transparent', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--dsw-alias-label-primary)', textAlign: 'left' },
                  },
                  t('showAll'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    onClick: (e) => {
                      e.stopPropagation();
                      refreshWorkspaces();
                    },
                    style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'transparent', border: 0, borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--dsw-alias-label-secondary)', textAlign: 'left' },
                  },
                  t('refresh'),
                ),
              ),
          );
        }

        // ---- 4. Settings page: palette + aliases ----
        function SettingsPage() {
          const palette = useStoreSel((st) => st.palette);
          const colors = useStoreSel((st) => st.colors);
          const [newName, setNewName] = React.useState('');
          const [newHex, setNewHex] = React.useState('#56B6C2');
          useWorkspaces();
          const usage = {};
          Object.keys(colors || {}).forEach((wsId) => {
            const cid = colors[wsId];
            usage[cid] = (usage[cid] || 0) + 1;
          });
          const Btn = (primitives && primitives.Button) || 'button';
          return h(
            'div',
            { style: { maxWidth: 560, padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 12 } },
            h('div', { style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', lineHeight: '18px' } }, t('settingsDesc')),
            (palette || []).map((c) =>
              h(
                'div',
                { key: c.id, style: { display: 'flex', alignItems: 'center', gap: 10 } },
                h('input', {
                  type: 'color',
                  value: c.hex,
                  'aria-label': c.name,
                  onChange: (e) => {
                    const next = getStore().palette.map((x) => (x.id === c.id ? { ...x, hex: e.target.value } : x));
                    setStore({ palette: next });
                  },
                  style: { width: 30, height: 24, padding: 0, border: '1px solid var(--dsw-alias-border-l4)', borderRadius: 4, background: 'transparent', cursor: 'pointer' },
                }),
                h('input', {
                  type: 'text',
                  value: c.name,
                  'aria-label': t('alias'),
                  onChange: (e) => {
                    const next = getStore().palette.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x));
                    setStore({ palette: next });
                  },
                  style: { flex: 1, minWidth: 0, height: 28, padding: '2px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--dsw-alias-border-l4)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' },
                }),
                h(
                  'span',
                  { style: { fontSize: 11, color: 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' } },
                  (usage[c.id] || 0) + ' ' + t('inUse'),
                ),
                h(
                  Btn,
                  {
                    onClick: () => {
                      const st = getStore();
                      const nextPalette = st.palette.filter((x) => x.id !== c.id);
                      if (nextPalette.length === 0) return;
                      const nextColors = { ...st.colors };
                      Object.keys(nextColors).forEach((k) => {
                        if (nextColors[k] === c.id) delete nextColors[k];
                      });
                      setStore({ palette: nextPalette, colors: nextColors, filter: st.filter.filter((id) => id !== c.id) });
                    },
                    disabled: (palette || []).length <= 1,
                    children: t('delete'),
                  },
                ),
              ),
            ),
            h(
              'div',
              { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('input', {
                type: 'color',
                value: newHex,
                onChange: (e) => setNewHex(e.target.value),
                style: { width: 30, height: 24, padding: 0, border: '1px solid var(--dsw-alias-border-l4)', borderRadius: 4, background: 'transparent', cursor: 'pointer' },
              }),
              h('input', {
                type: 'text',
                value: newName,
                placeholder: t('alias'),
                onChange: (e) => setNewName(e.target.value),
                style: { flex: 1, minWidth: 0, height: 28, padding: '2px 8px', fontSize: 12, borderRadius: 6, border: '1px solid var(--dsw-alias-border-l4)', background: 'transparent', color: 'var(--dsw-alias-label-primary)' },
              }),
              h(
                Btn,
                {
                  onClick: () => {
                    const name = newName.trim();
                    if (!name) return;
                    const st = getStore();
                    setStore({ palette: st.palette.concat([{ id: 'c' + Date.now().toString(36), name, hex: newHex }]) });
                    setNewName('');
                  },
                  children: t('addColor'),
                },
              ),
            ),
            h(
              Btn,
              {
                onClick: () => {
                  const st = getStore();
                  const valid = new Set(defaultStore().palette.map((c) => c.id));
                  const nextColors = {};
                  Object.keys(st.colors || {}).forEach((k) => {
                    if (valid.has(st.colors[k])) nextColors[k] = st.colors[k];
                  });
                  setStore({ palette: defaultStore().palette, colors: nextColors, filter: st.filter.filter((id) => valid.has(id)) });
                },
                children: t('reset'),
              },
            ),
          );
        }

        ctx.slots.inject('sidebar.session.row.hover', () =>
          ctx.slots.register(
            { name: 'sidebar.session.row.hover', id: 'session-cwd-opener-hover', order: -10 },
            SidebarHoverCwd,
          ),
        );

        ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
          ctx.slots.register(
            {
              name: 'sidebar.workspaces.session.menu.item',
              id: 'session-cwd-opener-menu',
              order: -10,
              label: () => t('openDir'),
            },
            SessionMenuCwd,
          ),
        );

        ctx.slots.inject('sidebar.footer.action', () =>
          ctx.slots.register(
            { name: 'sidebar.footer.action', id: 'session-cwd-opener-filter', order: 10, label: () => t('filterTitle') },
            FooterFilter,
          ),
        );

        ctx.slots.inject('settings.section', () =>
          ctx.slots.register(
            { name: 'settings.section', id: 'session-cwd-opener-colors', order: 30, label: () => t('settingsTitle') },
            SettingsPage,
          ),
        );

        // keep workspace map fresh: initial + on session-list change (debounced)
        let wsTimer = 0;
        refreshWorkspaces();
        try {
          subscribeSessions(() => {
            if (wsTimer) return;
            wsTimer = setTimeout(() => {
              wsTimer = 0;
              refreshWorkspaces();
            }, 600);
          });
        } catch (e) {}
      },
    };
  },
});
