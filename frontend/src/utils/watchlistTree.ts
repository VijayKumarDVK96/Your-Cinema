export interface FlatWatchlist {
  id: string;
  name: string;
  parent_id?: string | null;
  movie_count?: number;
  subfolder_count?: number;
  is_system?: boolean;
}

export interface WatchlistTreeOption extends FlatWatchlist {
  depth: number;
  displayText: string;
  paddingLeft: number;
}

/**
 * Transforms a flat list of watchlists into a depth-first ordered tree list with
 * visual indentation markers suitable for select dropdowns and menu items.
 */
export function buildWatchlistTreeOptions(watchlists: FlatWatchlist[]): WatchlistTreeOption[] {
  if (!Array.isArray(watchlists) || watchlists.length === 0) return [];

  const listMap = new Map<string, FlatWatchlist & { children: (FlatWatchlist & { children: any[] })[] }>();
  const roots: (FlatWatchlist & { children: (FlatWatchlist & { children: any[] })[] })[] = [];

  watchlists.forEach((item) => {
    listMap.set(item.id, { ...item, children: [] });
  });

  listMap.forEach((node) => {
    if (node.parent_id && listMap.has(node.parent_id)) {
      listMap.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const result: WatchlistTreeOption[] = [];

  function dfs(node: FlatWatchlist & { children: any[] }, depth: number) {
    const indent = '\u00A0\u00A0'.repeat(depth * 2);
    const prefix = depth > 0 ? '↳ 📁 ' : '📁 ';
    const countText = node.movie_count !== undefined ? ` (${node.movie_count} ${node.movie_count === 1 ? 'movie' : 'movies'})` : '';
    const displayText = `${indent}${prefix}${node.name}${countText}`;

    result.push({
      ...node,
      depth,
      displayText,
      paddingLeft: depth * 16 + 12,
    });

    node.children.forEach((child) => {
      if (listMap.has(child.id)) {
        dfs(listMap.get(child.id)!, depth + 1);
      }
    });
  }

  roots.forEach((root) => dfs(root, 0));

  return result;
}
