import useSWR from "swr";
import { JsonApiClient } from "drupal-canvas";
import { DrupalJsonApiParams } from "drupal-jsonapi-params";
import { useState, useMemo, useCallback } from "react";

const client = new JsonApiClient();
const ITEMS_PER_PAGE = 10;
const ENTITY_TYPE_MAP = {
  page: 'canvas_page',
  node: 'node'
};
const CONTENT_TYPE_FIELDS = ['article', 'person'];
const COMMON_FIELDS = ['title', 'path'];

// ============= Helper Functions =============

function getSearchQuery() {
  if (typeof window === 'undefined') return '';
  const searchParams = new URLSearchParams(window.location.search);
  return searchParams.get('q') || '';
}

// Consolidated function to add fields for all types
function addFieldsForAllTypes(params, fields) {
  params.addFields('page', fields);
  CONTENT_TYPE_FIELDS.forEach(contentType => {
    params.addFields(`node--${contentType}`, fields);
  });
  return params;
}

function buildFilterConfig(selectedEntityTypes, selectedContentTypes) {
  if (selectedEntityTypes.length === 0 && selectedContentTypes.length === 0) {
    return null;
  }

  const conditions = [];

  if (selectedEntityTypes.includes('page')) {
    conditions.push({ entity_type: ENTITY_TYPE_MAP.page });
  }

  if (selectedContentTypes.length > 0) {
    conditions.push({
      entity_type: ENTITY_TYPE_MAP.node,
      content_type: selectedContentTypes.length === 1
        ? selectedContentTypes[0]
        : { value: selectedContentTypes, operator: 'IN' }
    });
  } else if (selectedEntityTypes.includes('node')) {
    conditions.push({ entity_type: ENTITY_TYPE_MAP.node });
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];

  return { _or: true, conditions };
}

function buildSearchQuery(searchQuery, filterConfig, pageOffset) {
  const params = new DrupalJsonApiParams()
    .addPageLimit(ITEMS_PER_PAGE)
    .addPageOffset(pageOffset);

  addFieldsForAllTypes(params, COMMON_FIELDS);

  if (searchQuery) {
    params.addFilter('fulltext', searchQuery);
  }

  let queryString = params.getQueryString();

  if (filterConfig) {
    const filterParams = [];

    if (filterConfig._or && filterConfig.conditions) {
      filterConfig.conditions.forEach((condition, index) => {
        Object.entries(condition).forEach(([key, value]) => {
          const groupId = `condition_${index}`;
          filterParams.push(`filter[${groupId}][condition][path]=${key}`);

          if (typeof value === 'object' && value.operator) {
            filterParams.push(`filter[${groupId}][condition][operator]=${value.operator}`);
            const values = Array.isArray(value.value) ? value.value : [value.value];
            values.forEach((v, vIndex) => {
              filterParams.push(`filter[${groupId}][condition][value][${vIndex}]=${v}`);
            });
          } else {
            filterParams.push(`filter[${groupId}][condition][value]=${value}`);
          }

          filterParams.push(`filter[${groupId}][condition][memberOf]=or_group`);
        });
      });
      filterParams.push(`filter[or_group][group][conjunction]=OR`);
    } else {
      Object.entries(filterConfig).forEach(([key, value]) => {
        filterParams.push(`filter[${key}][condition][path]=${key}`);

        if (typeof value === 'object' && value.operator) {
          filterParams.push(`filter[${key}][condition][operator]=${value.operator}`);
          const values = Array.isArray(value.value) ? value.value : [value.value];
          values.forEach((v, vIndex) => {
            filterParams.push(`filter[${key}][condition][value][${vIndex}]=${v}`);
          });
        } else {
          filterParams.push(`filter[${key}][condition][value]=${value}`);
        }
      });
    }

    if (filterParams.length > 0) {
      queryString += '&' + filterParams.join('&');
    }
  }

  return queryString;
}

function buildFacetQuery(searchQuery) {
  const params = new DrupalJsonApiParams();
  addFieldsForAllTypes(params, ['type']);

  if (searchQuery) {
    params.addFilter('fulltext', searchQuery);
  }

  return params.getQueryString();
}

function calculateFacets(data) {
  if (!data?.length) {
    return { entityTypes: {}, contentTypes: {} };
  }

  const entityTypeCounts = {};
  const contentTypeCounts = {};

  data.forEach(item => {
    const [entityType, contentType] = item.type.split('--');
    entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;

    if (entityType === 'node' && contentType) {
      contentTypeCounts[contentType] = (contentTypeCounts[contentType] || 0) + 1;
    }
  });

  return { entityTypes: entityTypeCounts, contentTypes: contentTypeCounts };
}

// Calculate filtered facets based on selected content types
function calculateFilteredFacets(data, selectedContentTypes) {
  if (!data?.length) {
    return { entityTypes: {}, contentTypes: {} };
  }

  const entityTypeCounts = {};
  const contentTypeCounts = {};

  data.forEach(item => {
    const [entityType, contentType] = item.type.split('--');

    // If content types are selected, only count matching items
    if (selectedContentTypes.length > 0) {
      if (entityType === 'page') {
        entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;
      } else if (entityType === 'node' && contentType && selectedContentTypes.includes(contentType)) {
        entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;
        contentTypeCounts[contentType] = (contentTypeCounts[contentType] || 0) + 1;
      }
    } else {
      entityTypeCounts[entityType] = (entityTypeCounts[entityType] || 0) + 1;
      if (entityType === 'node' && contentType) {
        contentTypeCounts[contentType] = (contentTypeCounts[contentType] || 0) + 1;
      }
    }
  });

  return { entityTypes: entityTypeCounts, contentTypes: contentTypeCounts };
}

function extractOffsetFromLink(link) {
  if (!link?.href) return null;

  try {
    const url = new URL(link.href);
    const offset = url.searchParams.get('page[offset]');
    return offset ? Math.max(0, parseInt(offset, 10)) : null;
  } catch {
    return null;
  }
}

// ============= Main Component =============

export default function SearchWithFacets() {
  const searchQuery = useMemo(() => getSearchQuery(), []);
  const [selectedEntityTypes, setSelectedEntityTypes] = useState([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState([]);
  const [pageOffset, setPageOffset] = useState(0);

  const filterConfig = useMemo(
    () => buildFilterConfig(selectedEntityTypes, selectedContentTypes),
    [selectedEntityTypes, selectedContentTypes]
  );

  const facetQueryString = useMemo(
    () => buildFacetQuery(searchQuery),
    [searchQuery]
  );

  const searchQueryString = useMemo(
    () => buildSearchQuery(searchQuery, filterConfig, pageOffset),
    [searchQuery, filterConfig, pageOffset]
  );

  const { data: facetData } = useSWR(
    ["index--cms_content", facetQueryString],
    ([type, query]) => client.getCollection(type, { queryString: query }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000
    }
  );

  const { data: searchData, links: searchLinks, error, isLoading } = useSWR(
    ["index--cms_content", searchQueryString],
    async ([type, query]) => {
      const response = await fetch(`/api/index/cms_content?${searchQueryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch search results');
      }
      const searchResponse = await response.json();
      // Return only data and links
      return {
        data: searchResponse.data,
        links: searchResponse.links,
      };
    },
    { revalidateOnFocus: false }
  );

  // Calculate facets from unfiltered facet data
  const baseFacets = useMemo(() => calculateFacets(facetData), [facetData]);

  // Calculate filtered facets when content types are selected
  const facets = useMemo(
    () => calculateFilteredFacets(facetData, selectedContentTypes),
    [facetData, selectedContentTypes]
  );

  // Get items from search results
  const items = searchData?.data || [];
  const links = searchData?.links || {};

  const toggleEntityType = useCallback((type) => {
    setSelectedEntityTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    if (type === 'page') {
      setSelectedContentTypes([]); // Reset content type filters when Canvas Page is selected
    }
    setPageOffset(0);
  }, []);

  const toggleContentType = useCallback((type) => {
    setSelectedContentTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
    setPageOffset(0);
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedEntityTypes([]);
    setSelectedContentTypes([]);
    setPageOffset(0);
  }, []);

  const handlePageChange = useCallback((link) => {
    const offset = extractOffsetFromLink(link);
    if (offset !== null) {
      setPageOffset(offset);
    }
  }, []);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">An error occurred while loading search results.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
        <p className="mt-2 text-[#6B7280]">Loading results...</p>
      </div>
    );
  }

  const hasFilters = selectedEntityTypes.length > 0 || selectedContentTypes.length > 0;

  return (
    <div className="flex gap-6">
      {Object.keys(facets.entityTypes).length > 0 && (
        <aside className="w-64 flex-shrink-0 search-facets">
          <div className="bg-white border border-[#E5E7EB] rounded-lg p-6 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-[#111827]">Filters</h3>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#2563EB] hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="mb-6">
              <h4 className="font-semibold text-sm text-[#374151] mb-4">Entity Type</h4>
              {Object.entries(facets.entityTypes).map(([type, count]) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer hover:bg-[#F9FAFB] p-1 rounded mb-2"
                >
                  <input
                    type="checkbox"
                    checked={selectedEntityTypes.includes(type)}
                    onChange={() => toggleEntityType(type)}
                    className="w-4 h-4 text-[#2563EB] rounded"
                  />
                  <span className="text-sm text-[#374151] flex-1">
                    {type === 'node' ? 'Content' : type === 'page' ? 'Canvas Page' : type}
                  </span>
                  <span className="text-xs text-[#9CA3AF] font-medium">
                    ({count})
                  </span>
                </label>
              ))}
            </div>

            {Object.keys(baseFacets.contentTypes).length > 0 && !selectedEntityTypes.includes('page') && (
              <div>
                <h4 className="font-semibold text-sm text-[#374151] mb-4">Content Type</h4>
                {Object.entries(baseFacets.contentTypes).map(([type, count]) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer hover:bg-[#F9FAFB] p-1 rounded mb-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedContentTypes.includes(type)}
                      onChange={() => toggleContentType(type)}
                      className="w-4 h-4 text-[#2563EB] rounded"
                    />
                    <span className="text-sm text-[#374151] flex-1 capitalize">
                      {type}
                    </span>
                    <span className="text-xs text-[#9CA3AF] font-medium">
                      ({count})
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0 search-results">
        <h2 className="font-bold text-2xl mb-4">
          Search Results
        </h2>

        {items.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#6B7280] mb-2">No results found.</p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-[#2563EB] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <ul className="space-y-1">
             {items.map((item, index) => (
                <li key={item.id || index} className="border-b border-[#E5E7EB] py-3">
                  <h3 className="font-semibold text-[#2563EB] hover:underline">
                    <a href={item.attributes?.path?.alias || '#'}>
                      {item.attributes?.title}
                    </a>
                  </h3>
                </li>
              ))}
            </ul>

            {(links) && (
              <div className="flex gap-2 mt-6 search-pagination">
                {links.first && (
                  <button
                    onClick={() => handlePageChange(links.first)}
                    className="px-4 py-2 border rounded-lg bg-white border-[#E5E7EB] text-[#6B7280] text-sm flex items-center hover:bg-[#F9FAFB]"
                  >
                    First
                  </button>
                )}
                {links.prev && (
                  <button
                    onClick={() => handlePageChange(links.prev)}
                    className="px-4 py-2 border rounded-lg bg-white border-[#E5E7EB] text-[#6B7280] text-sm flex items-center hover:bg-[#F9FAFB]"
                  >
                    <svg className="mr-1" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M10 12L6 8L10 4" stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Previous
                  </button>
                )}
                {links.next && (
                  <button
                    onClick={() => handlePageChange(links.next)}
                    className="px-4 py-2 border rounded-lg bg-white border-[#E5E7EB] text-[#6B7280] text-sm flex items-center hover:bg-[#F9FAFB]"
                  >
                    Next
                    <svg className="ml-1" width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M6 12L10 8L6 4" stroke="#4B5563" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                )}
                {links.last && (
                  <button
                    onClick={() => handlePageChange(links.last)}
                    className="px-4 py-2 border rounded-lg bg-white border-[#E5E7EB] text-[#6B7280] text-sm flex items-center hover:bg-[#F9FAFB]"
                  >
                    Last
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
