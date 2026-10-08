import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const DEFAULT_PAGE_SIZE = 10;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const MAX_EXPOSED_FILTERS = 5;
const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const EMPTY_FILTER_VALUES = {
  1: '',
  2: '',
  3: '',
  4: '',
  5: '',
};

function isValuePresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

function formatMetadataLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMetadataValue(value) {
  if (Array.isArray(value)) {
    return value
      .filter(isValuePresent)
      .map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item)))
      .join(', ');
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return String(value);
}

function flattenMetadataFields(fields = {}) {
  const entries = [];

  Object.entries(fields).forEach(([key, value]) => {
    if (!isValuePresent(value)) return;

    if (Array.isArray(value)) {
      const filtered = value.filter(isValuePresent);
      if (filtered.length) {
        entries.push([
          key,
          filtered.map((item) => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', '),
        ]);
      }
      return;
    }

    if (typeof value === 'object' && value !== null) {
      const nested = flattenMetadataFields(value);
      nested.forEach(([nestedKey, nestedValue]) => {
        entries.push([`${key}.${nestedKey}`, nestedValue]);
      });
      return;
    }

    entries.push([key, formatMetadataValue(value)]);
  });

  return entries;
}

function getValueByPath(object, path) {
  if (!object || !path || typeof path !== 'string') return undefined;

  return path
    .split('.')
    .reduce((acc, key) => acc?.[key], object);
}

function getAssetLabel(asset, assetLabelKey = '') {
  if (assetLabelKey !== null && assetLabelKey !== undefined && assetLabelKey !== '') {
    const metadataFields = asset?.metadata?.fields || {};
    const metadataValue = getValueByPath(metadataFields, assetLabelKey);

    if (isValuePresent(metadataValue)) {
      return formatMetadataValue(metadataValue);
    }
  }

  return asset?.display_name ?? asset?.filename ?? 'Asset';
}

function escapeQueryValue(value) {
  return String(value).replace(/"/g, '\\"');
}

function normalizeVocabularyOptions(vocabulary) {
  if (!Array.isArray(vocabulary)) return [];
  return vocabulary
    .filter(isValuePresent)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function getControlledVocabularyFieldsFromAssets(assets = []) {
  const map = new Map();

  assets.forEach((asset) => {
    const fields = asset?.metadata_info?.field_set_fields || [];
    fields.forEach((field) => {
      const key = field?.key;
      const vocabulary = normalizeVocabularyOptions(field?.vocabulary);

      if (key && field?.controlled_vocabulary && vocabulary.length && !map.has(key)) {
        map.set(key, {
          key,
          label: field?.label || formatMetadataLabel(key),
          vocabulary,
          type: field?.type || field?.field_type || '',
          field_type: field?.field_type || field?.type || '',
        });
      }
    });
  });

  return Array.from(map.values());
}

function buildExposedFilterConfigs(props) {
  return Array.from({ length: MAX_EXPOSED_FILTERS }, (_, index) => {
    const position = index + 1;
    return {
      id: position,
      fieldKey: props[`filter${position}`] || '',
    };
  }).filter((config) => config.fieldKey);
}

function sanitizePageSizeOptions(options = []) {
  const normalized = options
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);

  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

function LoadingSkeleton({ showFilename, pageSize, showActionButtons, heightClass }) {
  return (
    <>
      {Array.from({ length: pageSize }).map((_, i) => (
        <div
          key={i}
          className={`dam-asset-gallery-card bg-white rounded-lg border border-brand-tint-15 shadow-sm overflow-hidden flex flex-col flex-shrink-0 ${heightClass}`}
        >
          <div className="dam-asset-gallery-card-thumbnail bg-gray-200 animate-pulse flex-shrink-0 h-60" />
          {showFilename && (
            <div className="dam-asset-gallery-card-filename border-t border-brand-tint-15 flex-shrink-0 p-1 h-10">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
            </div>
          )}
          {showActionButtons && (
            <div className="dam-asset-gallery-card-actions border-t border-brand-tint-15 flex items-center justify-end gap-1 flex-shrink-0 p-1 h-14">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
          )}
        </div>
      ))}
    </>
  );
}

export default function DamAssetSearch({
  title = '',
  assetsSource = '',
  identifier = '',
  assetLabel = '',
  defaultAssetsPerPage = DEFAULT_PAGE_SIZE,
  itemsPerPageOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  enableAssetsPerPageForVisitors = true,
  defaultAssetsSortOrder = 'relevance',
  enableShare = true,
  enableDownload = true,
  showFilename = true,
  showAssetMetadata = true,
  showSearchBar = true,
  enableAssetsSortOrderForVisitors = true,
  filter1 = '',
  filter2 = '',
  filter3 = '',
  filter4 = '',
  filter5 = '',
}) {
  const normalizedPageSizeOptions = useMemo(() => {
    const options = sanitizePageSizeOptions([defaultAssetsPerPage, ...itemsPerPageOptions]);
    return options.length ? options : [DEFAULT_PAGE_SIZE];
  }, [defaultAssetsPerPage, itemsPerPageOptions]);
  const [localFilenameQuery, setLocalFilenameQuery] = useState('');
  const [submittedFilenameQuery, setSubmittedFilenameQuery] = useState('');
  const [assets, setAssets] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentItemsPerPage, setCurrentItemsPerPage] = useState(
    normalizedPageSizeOptions.includes(defaultAssetsPerPage) ? defaultAssetsPerPage : normalizedPageSizeOptions[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [previewIndex, setPreviewIndex] = useState(null);
  const [shareAsset, setShareAsset] = useState(null);
  const [downloadAsset, setDownloadAsset] = useState(null);
  const [filterValues, setFilterValues] = useState(EMPTY_FILTER_VALUES);

  const [filterDefinitions, setFilterDefinitions] = useState([]);
  const filterDefinitionsInitializedRef = useRef(false);

  const [selectedSortOrder, setSelectedSortOrder] = useState(defaultAssetsSortOrder);

  const showActionButtons = enableDownload || enableShare;
  const heightClass = showFilename && showActionButtons ? 'h-84' : showFilename ? 'h-70' : showActionButtons ? 'h-[296px]' : 'h-60';

  useEffect(() => {
    setCurrentItemsPerPage(
      normalizedPageSizeOptions.includes(defaultAssetsPerPage) ? defaultAssetsPerPage : normalizedPageSizeOptions[0]
    );
  }, [defaultAssetsPerPage, normalizedPageSizeOptions]);

  useEffect(() => {
    setSelectedSortOrder(defaultAssetsSortOrder);
  }, [defaultAssetsSortOrder]);

  const totalPages = Math.ceil(totalCount / currentItemsPerPage);

  const exposedFilterConfigs = useMemo(
    () =>
      buildExposedFilterConfigs({
        filter1,
        filter2,
        filter3,
        filter4,
        filter5,
      }),
    [filter1, filter2, filter3, filter4, filter5]
  );

  const filterDefinitionsMap = useMemo(() => {
    const map = new Map();
    filterDefinitions.forEach((field) => map.set(field.key, field));
    return map;
  }, [filterDefinitions]);

  const visibleExposedFilters = useMemo(() => {
    return exposedFilterConfigs
      .map((config) => {
        const fieldDefinition = filterDefinitionsMap.get(config.fieldKey);
        if (!fieldDefinition) return null;

        return {
          ...config,
          ...fieldDefinition,
          selectedValue: filterValues[config.id],
        };
      })
      .filter(Boolean);
  }, [exposedFilterConfigs, filterDefinitionsMap, filterValues]);

  const configuredFieldDefinitions = useMemo(() => {
    return exposedFilterConfigs
      .map((config) => {
        const fieldDefinition = filterDefinitionsMap.get(config.fieldKey);
        if (!fieldDefinition) return null;

        return {
          ...config,
          ...fieldDefinition,
        };
      })
      .filter(Boolean);
  }, [exposedFilterConfigs, filterDefinitionsMap]);

  const activeFilterChips = useMemo(() => {
    const chips = [];

    visibleExposedFilters.forEach((filter) => {
      if (filter.selectedValue) {
        chips.push({
          key: `filter-${filter.id}`,
          label: `${filter.label}: ${filter.selectedValue}`,
          onRemove: filter.id,
        });
      }
    });

    return chips;
  }, [visibleExposedFilters]);

  const buildSearchQuery = useCallback((filenameValue, appliedFilterValues) => {
    const trimmedFilename = filenameValue.trim();
    const trimmedIdentifier = identifier.trim();
    const parts = [];

    if (trimmedFilename) {
      parts.push(`fn:(${trimmedFilename})`);
    }

    if (trimmedIdentifier) {
      if (assetsSource === "category") {
        parts.push(`cat:({${escapeQueryValue(trimmedIdentifier)}})`);
      } else if (assetsSource === "collection") {
        parts.push(`acn:({${escapeQueryValue(trimmedIdentifier)}})`);
      } else if (assetsSource === "syntax") {
        parts.push(trimmedIdentifier);
      }
    }

    configuredFieldDefinitions.forEach((field) => {
      const selectedValue = appliedFilterValues?.[field.id];
      if (!selectedValue) return;
      parts.push(`${field.key}:(${escapeQueryValue(selectedValue)})`);
    });

    return parts.join(' ');
  }, [assetsSource, identifier, configuredFieldDefinitions]);

  const buildSearchQueryRef = useRef(buildSearchQuery);
  buildSearchQueryRef.current = buildSearchQuery;

  const fetchAssets = useCallback(async ({
    page = 1,
    filename = '',
    filters = EMPTY_FILTER_VALUES,
    activeSortOrder = defaultAssetsSortOrder,
    pageSize = currentItemsPerPage,
  }) => {
    const builtQuery = buildSearchQueryRef.current(filename, filters);
    const offset = (page - 1) * pageSize;

    if (!builtQuery) {
      setAssets([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: builtQuery,
        limit: String(pageSize),
        offset: String(offset),
        sort: String(activeSortOrder || defaultAssetsSortOrder),
      });

      const response = await fetch(`/api/acquia-dam/search?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();
      const items = data?.items ?? [];

      setAssets(items);
      setTotalCount(data?.total_count ?? 0);

      if (!filterDefinitionsInitializedRef.current && items.length > 0) {
        const derivedDefinitions = getControlledVocabularyFieldsFromAssets(items);
        setFilterDefinitions(derivedDefinitions);
        filterDefinitionsInitializedRef.current = true;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAssets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentItemsPerPage, defaultAssetsSortOrder]);

  useEffect(() => {
    fetchAssets({
      page: currentPage,
      filename: submittedFilenameQuery,
      filters: filterValues,
      activeSortOrder: selectedSortOrder,
      pageSize: currentItemsPerPage,
    });
  }, [fetchAssets, currentPage, submittedFilenameQuery, filterValues, selectedSortOrder, currentItemsPerPage]);

  const handleSearchSubmit = () => {
    const trimmed = localFilenameQuery.trim();
    setCurrentPage(1);
    setSubmittedFilenameQuery(trimmed);
  };

  const handleSearchReset = () => {
    setCurrentPage(1);
    setLocalFilenameQuery('');
    setSubmittedFilenameQuery('');
  };

  const handleFilterChange = (filterId, value) => {
    setCurrentPage(1);
    const nextFilterValues = {
      ...filterValues,
      [filterId]: value,
    };
    setFilterValues(nextFilterValues);
  };

  const handleSortChange = (value) => {
    setCurrentPage(1);
    setSelectedSortOrder(value);
  };

  const handleItemsPerPageChange = (value) => {
    const nextPageSize = Number(value);
    if (!Number.isInteger(nextPageSize) || nextPageSize <= 0) return;
    setCurrentPage(1);
    setCurrentItemsPerPage(nextPageSize);
  };

  const handleRemoveChip = (chipType) => {
    setCurrentPage(1);
    setFilterValues((prev) => ({
        ...prev,
        [chipType]: '',
    }));
  };

  const handleClearAllTags = () => {
    setCurrentPage(1);
    setLocalFilenameQuery('');
    setSubmittedFilenameQuery('');
    setFilterValues({ ...EMPTY_FILTER_VALUES });
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearchSubmit();
    }
  };

  const startCol2 = enableAssetsPerPageForVisitors && enableAssetsSortOrderForVisitors ? '' : 'sm:col-start-2';

  return (
    <div className="dam-asset-gallery flex flex-col gap-4 p-4 font-sans">

      {/* Row 1: Title + asset count */}
      <div className="dam-asset-gallery-header flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {totalCount > 0 && !loading && (
          <span className="text-xs font-normal text-brand-charcoal">
            Showing {(currentPage - 1) * currentItemsPerPage + 1}–{Math.min(currentPage * currentItemsPerPage, totalCount)} of {totalCount} assets
          </span>
        )}
      </div>

      {/* Row 2: Search + per-page + sort */}
      {(showSearchBar || enableAssetsPerPageForVisitors || enableAssetsSortOrderForVisitors) && (
        <div className="dam-asset-gallery-filter-visibility gap-3 grid md:grid-cols-3">
          {showSearchBar && (
            <div className="dam-asset-gallery-filter-visibility-search w-full md:col-span-2 grid md:grid-cols-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-brand-black pointer-events-none">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={localFilenameQuery}
                  onChange={(e) => setLocalFilenameQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search for assets"
                  className="w-full h-10 pl-9 pr-9 border border-indigo-100 rounded-md bg-white text-sm font-medium text-brand-ink dam-asset-gallery-search"
                  disabled={loading}
                />
                {localFilenameQuery && (
                  <button
                    type="button"
                    onClick={handleSearchReset}
                    className="absolute inset-y-0 right-0 w-9 inline-flex items-center justify-center text-brand-ocean"
                    title="Clear search"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="dam-asset-gallery-filter-visibility-dropdown gap-3 w-full ml-auto grid sm:grid-cols-2 justify-items-end">
            {enableAssetsPerPageForVisitors && (
              <CustomSelect
                className={startCol2}
                value={String(currentItemsPerPage)}
                disabled={loading}
                onChange={(value) => handleItemsPerPageChange(value)}
                options={normalizedPageSizeOptions.map((option) => ({
                  value: String(option),
                  label: `${option} per page`,
                }))}
              />
            )}

            {enableAssetsSortOrderForVisitors && (
              <CustomSelect
                className={startCol2}
                value={selectedSortOrder}
                disabled={loading}
                onChange={(value) => handleSortChange(value)}
                options={[
                  { value: "relevance", label: "Relevance" },
                  { value: "-created_date", label: "Date added: Newest to oldest" },
                  { value: "created_date", label: "Date added: Oldest to newest" },
                  { value: "-last_update_date", label: "Date updated: Newest to oldest" },
                  { value: "last_update_date", label: "Date updated: Oldest to newest" },
                  { value: "filename", label: "Filename: A to Z" },
                  { value: "-filename", label: "Filename: Z to A" },
                ]}
              />
            )}
          </div>
        </div>
      )}

      {/* Filters card */}
      {visibleExposedFilters.length > 0 && (
        <div className="dam-asset-gallery-filter bg-white border border-brand-tint-15 rounded-lg p-4">
          <h2 className="text-lg font-medium text-black mb-3">Filters</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {visibleExposedFilters.map((filter) => (
              <CustomSelect
                label={filter.label}
                value={filter.selectedValue}
                placeholder="All"
                disabled={loading}
                onChange={(value) => handleFilterChange(filter.id, value)}
                options={[
                  { value: "", label: "All" },
                    ...filter.vocabulary.map((option) => ({
                    value: option,
                    label: option,
                  })),
                ]}
              />
            ))}
          </div>
          {/* Active filter chips */}
          {activeFilterChips.length > 0 && (
            <div className="dam-asset-gallery-filter-chips flex flex-wrap items-center gap-3 mt-4">
              {activeFilterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={() => handleRemoveChip(chip.onRemove)}
                  className="inline-flex items-center gap-2 px-3 py-1 border rounded-md border-brand-blue-midnight text-brand-blue text-xs font-medium bg-white"
                >
                  <span>{chip.label}</span>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearAllTags}
                className="text-xs text-brand-blue font-normal"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          Failed to load assets: {error}
        </div>
      )}

      <div className="dam-asset-gallery-grid grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pt-5">
        {loading ? (
          <LoadingSkeleton
            showFilename={showFilename}
            pageSize={currentItemsPerPage}
            showActionButtons={showActionButtons}
            heightClass={heightClass}
          />
        ) : assets.length === 0 && !error ? (
          <div className="col-span-full text-center text-gray-400 py-16 text-sm">No assets found.</div>
        ) : (
          assets.map((asset, index) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              assetLabel={assetLabel}
              enableShare={enableShare}
              enableDownload={enableDownload}
              onPreview={() => setPreviewIndex(index)}
              onShare={setShareAsset}
              onDownload={setDownloadAsset}
              showFilename={showFilename}
              showActionButtons={showActionButtons}
              heightClass={heightClass}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center flex-wrap gap-1 pt-2">
          {/* < Previous */}
          <button
            type="button"
            disabled={currentPage === 1 || loading}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="px-3 py-1.5 text-sm text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            &lsaquo; Previous
          </button>

          {/* Page numbers with ellipsis */}
          {(() => {
            const delta = 1;
            const rangeSet = new Set([1, totalPages]);
            for (let i = currentPage - delta; i <= currentPage + delta; i++) {
              if (i >= 1 && i <= totalPages) rangeSet.add(i);
            }
            const sorted = Array.from(rangeSet).sort((a, b) => a - b);
            const items = [];
            sorted.forEach((page, i) => {
              if (i > 0 && page - sorted[i - 1] > 1) {
                items.push('...' + i);
              }
              items.push(page);
            });
            return items.map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  disabled={loading}
                  onClick={() => setCurrentPage(item)}
                  className={`px-2 py-1.5 text-brand-blue text-sm hover:bg-gray-50 ${
                    item === currentPage
                      ? 'font-semibold'
                      : ''
                  }`}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="px-1 py-1.5 text-sm text-brand-blue select-none">…</span>
              )
            );
          })()}

          {/* Next > */}
          <button
            type="button"
            disabled={currentPage === totalPages || loading}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="px-3 py-1.5 text-sm text-brand-blue disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next &rsaquo;
          </button>
        </div>
      )}

      {previewIndex !== null && assets[previewIndex] && (
        <PreviewModal
          assets={assets}
          currentIndex={previewIndex}
          enableShare={enableShare}
          enableDownload={enableDownload}
          showFilename={showFilename}
          showAssetMetadata={showAssetMetadata}
          assetLabel={assetLabel}
          onClose={() => setPreviewIndex(null)}
          onPrev={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
          onNext={() => setPreviewIndex((prev) => Math.min(assets.length - 1, prev + 1))}
        />
      )}

      {shareAsset && (
        <ShareModal
          asset={shareAsset}
          assetLabel={assetLabel}
          onClose={() => setShareAsset(null)}
        />
      )}

      {downloadAsset && (
        <DownloadModal
          asset={downloadAsset}
          assetLabel={assetLabel}
          onClose={() => setDownloadAsset(null)}
        />
      )}
    </div>
  );
}

function CustomSelect({
  label,
  value,
  options,
  disabled,
  onChange,
  placeholder,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label || placeholder || "Select";

  return (
    <div ref={wrapperRef} className={`relative flex flex-col gap-1 w-full ${className}`}>
      {label && <label className="text-xs font-medium text-brand-muted">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="relative h-10 w-full rounded-md border border-indigo-100 bg-white px-3 pr-10 text-left text-sm font-normal focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="block truncate text-brand-black">{selectedLabel}</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-black">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`block w-full px-3 py-2 text-left text-xs text-brand-dark font-normal hover:bg-gray-50 ${
                value === option.value ? "bg-gray-50 text-brand-black" : ""
              }`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function getThumbnailUrl(asset) {
  let thumbnailUrl = asset?.embeds?.['original']?.url || '';

  if (thumbnailUrl) {
    try {
      const url = new URL(thumbnailUrl);
      url.pathname = url.pathname
        .replace('/original/', '/web/')
        .replace(/\.[^/.]+$/, '.png');
      url.searchParams.delete('download');
      url.searchParams.delete('t.download');
      url.searchParams.set('w', '300');
      thumbnailUrl = url.toString();
    }
    catch (unused) {
      thumbnailUrl = '';
    }
  }

  return thumbnailUrl;
}

function AssetCard({
  key,
  asset,
  assetLabel,
  enableShare,
  enableDownload,
  onPreview,
  onShare,
  onDownload,
  showFilename,
  showActionButtons,
  heightClass,
}) {
  const thumbnailUrl = getThumbnailUrl(asset);

  const resolvedAssetLabel = getAssetLabel(asset, assetLabel);

  return (
    <div
      key={key}
      className={`dam-asset-gallery-card bg-white rounded-lg border border-brand-tint-15 shadow-sm overflow-hidden flex flex-col flex-shrink-0 ${heightClass}`}
      onClick={() => onPreview(asset)}
    >
      {/* Thumbnail — 230×230 with 5px padding */}
      <div
        className="dam-asset-gallery-card-thumbnail bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0 p-2 h-60"
      >
        <img
          src={thumbnailUrl}
          alt={resolvedAssetLabel}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </div>

      {/* Filename — 230×40 with 5px padding, hidden when showFilename=false */}
      {showFilename && (
        <div
          className="dam-asset-gallery-card-filename text-xs font-normal border-t border-brand-tint-15 flex items-center flex-shrink-0 p-1 h-10"
        >
          <p className="text-xs text-gray-700 font-normal text-brand-slate truncate w-full" title={resolvedAssetLabel}>
            {resolvedAssetLabel}
          </p>
        </div>
      )}

      {/* Action buttons — 230×60 with 5px padding */}
      {showActionButtons && (
        <div
          className="dam-asset-gallery-card-actions border-t border-brand-tint-15 flex items-center justify-end gap-1 flex-shrink-0 p-1 h-14"
        >
          {enableDownload && (
            <button
              type="button"
              title="Download"
              className="bg-white hover:text-brand-blue text-brand-blue rounded-md p-2 transition cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onDownload(asset); }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>
          )}
          {enableShare && (
            <button
              type="button"
              title="Share"
              className="bg-white hover:text-brand-blue text-brand-blue rounded-md p-2 transition cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onShare(asset); }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PreviewModal({
  assets,
  currentIndex,
  onClose,
  onPrev,
  onNext,
  enableShare,
  enableDownload,
  showFilename,
  showAssetMetadata = true,
  assetLabel,
}) {
  const asset = assets[currentIndex];
  const [zoom, setZoom] = useState(1);
  const [showInfoPanel, setShowInfoPanel] = useState(showAssetMetadata);

  const formatType = asset?.file_properties?.format_type?.toLowerCase?.() || '';
  const embeds = asset?.embeds || {};

  const resolvedAssetLabel = getAssetLabel(asset, assetLabel);
  const metadataEntries = useMemo(
    () => flattenMetadataFields(asset?.metadata?.fields || {}),
    [asset]
  );

  const isImage = ['image', 'generic_binary', 'compressed_archive'].includes(formatType);
  const isVideo = formatType === 'video';
  const isAudio = formatType === 'audio';
  const isDocument = ['document', 'pdf', 'office'].includes(formatType);
  const isSpinset = formatType === 'project_archive' && asset?.file_properties?.format === 'SpinSet';

  // Strip download-forcing query params from any URL or HTML string so
  // media/iframe elements receive a streamable URL, not a forced download.
  const stripDownload = (str) => (str || '')
    .replace(/&t\.download=true/g, '')
    .replace(/\?t\.download=true&/g, '?')
    .replace(/\?t\.download=true/g, '')
    .replace(/&download=true/g, '')
    .replace(/\?download=true&/g, '?')
    .replace(/\?download=true/g, '');

  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'i' || e.key === 'I') setShowInfoPanel((prev) => !prev);
      if (e.key === '+' || e.key === '=') setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP));
      if (e.key === '-') setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP));
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < assets.length - 1;

  const renderPreviewContent = () => {
    const renderEmbedIframe = (url, label) => {
      if (!url) return null;
      return (
        <div className="w-full h-full p-4">
          <iframe
            src={url}
            allowFullScreen
            frameBorder="0"
            className="w-full h-full-50px"
            title={label}
          />
        </div>
      );
    };

    if (isVideo) {
      const result = renderEmbedIframe(stripDownload(embeds.video_player_with_download?.url), resolvedAssetLabel);
      if (result) return result;
    }

    if (isAudio) {
      const result = renderEmbedIframe(stripDownload(embeds.streaming_mp3?.url), resolvedAssetLabel);
      if (result) return result;
    }

    if (isDocument) {
      const result = renderEmbedIframe(stripDownload(embeds.document_html5_viewer?.url), resolvedAssetLabel);
      if (result) return result;
    }

    if (isSpinset) {
      const result = renderEmbedIframe(stripDownload(embeds.spinset_viewer?.url), resolvedAssetLabel);
      if (result) return result;
    }

    const imageSrcSet = Object.entries(embeds)
        .filter(([size, t]) => t?.url && parseInt(size, 10) >= 300)
      .map(([size, t]) => {
        const w = parseInt(size, 10);
        return w ? `${stripDownload(t.url)} ${w}w` : null;
      })
      .filter(Boolean)
      .join(', ');

    const imageUrl = stripDownload(embeds['original']?.url) || '';

    if (!imageUrl && !imageSrcSet) {
      return (
        <div className="text-center text-gray-400 px-6">
          <p className="text-sm">Preview not available for this asset.</p>
        </div>
      );
    }
    return (
      <div className="w-full h-full overflow-auto flex items-center justify-center p-10">
        <img
          src={imageUrl}
          srcSet={imageSrcSet || undefined}
          sizes={showAssetMetadata && showInfoPanel
            ? "(min-width: 48rem) calc(100vw - 28.75rem), calc(100vw - 5rem)"
            : "calc(100vw - 5rem)"}
          alt={resolvedAssetLabel}
          className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out shadow-lg"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        />
      </div>
    );

  };

  return (
    <div
      className="dam-asset-gallery-modal-overlay fixed inset-0 bg-black bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dam-asset-gallery-modal bg-white rounded-xl shadow-2xl w-full h-full overflow-hidden flex">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="dam-asset-gallery-preview-modal-toolbar h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
            <div className="min-w-0 pr-4">
              {showFilename && (
                <h2
                  className="text-2xl md:text-base font-bold text-brand-dark truncate"
                  title={resolvedAssetLabel}
                >
                  {resolvedAssetLabel}
                </h2>
              )}
            </div>

            <div className="flex items-center shrink-0">
              {showAssetMetadata && (
              <button
                type="button"
                onClick={() => setShowInfoPanel((prev) => !prev)}
                className={`h-14 w-14 flex items-center justify-center border-l border-gray-200 text-brand-dark transition cursor-pointer hover:bg-gray-50 ${showInfoPanel ? 'bg-gray-100' : ''}`}
                title="Toggle metadata"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="9" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0-8h.01" />
                </svg>
              </button>
              )}

              <button
                type="button"
                onClick={onPrev}
                disabled={!canGoPrev}
                className="h-14 w-14 flex items-center justify-center border-l border-gray-200 text-brand-dark hover:bg-gray-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onNext}
                disabled={!canGoNext}
                className="h-14 w-14 flex items-center justify-center border-l border-gray-200 text-brand-dark hover:bg-gray-50 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="h-14 w-14 flex items-center justify-center border-l border-gray-200 text-brand-dark hover:bg-gray-50 transition cursor-pointer"
                title="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="dam-asset-gallery-modal-content grid sm:grid-cols-3 md:grid-cols-5 w-full h-full">
            <div className={`dam-asset-gallery-preview-modal-viewer bg-slate-400 overflow-hidden items-center justify-center sm:col-span-1 relative flex transition-all duration-300 sm:col-span-1 ${showAssetMetadata && showInfoPanel ? 'md:col-span-4' : 'md:col-span-5'}`}>
              {renderPreviewContent()}

              {isImage && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border  border-white border-opacity-20 rounded-xl shadow-lg flex items-center overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.max(MIN_ZOOM, prev - ZOOM_STEP))}
                    disabled={zoom <= MIN_ZOOM}
                    className="h-12 w-12 flex items-center justify-center text-white hover:text-black bg-slate-600 hover:bg-white hover:bg-opacity-10 transition disabled:opacity-30 cursor-pointer"
                    title="Zoom out"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="h-12 w-12 flex items-center justify-center text-white hover:text-black border-l border-r  border-white border-opacity-10 bg-slate-600 hover:bg-white hover:bg-opacity-10 transition cursor-pointer"
                    title="Reset zoom"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <circle cx="11" cy="11" r="7" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoom((prev) => Math.min(MAX_ZOOM, prev + ZOOM_STEP))}
                    disabled={zoom >= MAX_ZOOM}
                    className="h-12 w-12 flex items-center justify-center text-white hover:text-black bg-slate-600 hover:bg-white hover:bg-opacity-10 transition disabled:opacity-30 cursor-pointer"
                    title="Zoom in"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {showAssetMetadata && showInfoPanel && (
            <aside className="dam-asset-gallery-preview-modal-info-panel bg-white border-l border-gray-200 overflow-hidden">
              <div className="h-full overflow-y-auto p-4">
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => setShowInfoPanel((prev) => !prev)}
                    className="shrink-0 p-2 transition cursor-pointer"
                    title="Toggle metadata"
                  >
                    <span className="text-sm font-normal text-brand-blue">{'>'}</span>
                  </button>

                  <div className="min-w-0">
                    <h3 className="dam-asset-gallery-preview-modal-info-panel-header text-lg font-bold text-black break-words">
                      File details
                    </h3>
                  </div>
                </div>

                <div className="overflow-hidden">
                  <div className="grid grid-cols-5">
                    <div className="py-1 text-xs font-bold text-black col-span-2">Format type</div>
                    <div className="py-1 text-xs font-normal text-black break-words col-span-3">{formatType || '-'}</div>
                  </div>

                  {metadataEntries.length ? (
                    metadataEntries.map(([key, value], index) => (
                      <div
                        key={key}
                        className="grid grid-cols-5"
                      >
                        <div className="py-1 text-sx font-bold text-black break-words col-span-2">
                          {formatMetadataLabel(key)}
                        </div>
                        <div className="py-1 text-xs font-normal text-black break-words whitespace-pre-wrap col-span-3">
                          {value}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-2 text-base font-normal text-brand-gray italic">There aren't any details available for this file.</div>
                  )}
                </div>
              </div>
            </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShareModal({ asset, assetLabel, onClose }) {
  const filename = getAssetLabel(asset, assetLabel);
  const thumbnailUrl = getThumbnailUrl(asset);

  const embeds = asset?.embeds ?? {};
  const embedOptions = Object.keys(embeds).filter((k) => k !== 'original' && k !== 'templated');
  const [selectedEmbed, setSelectedEmbed] = useState(embedOptions[0] ?? '');
  const [activeShareTab, setActiveShareTab] = useState(embedOptions.length > 0 ? 'embed' : 'direct');
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedDirect, setCopiedDirect] = useState(false);

  const embedCode = selectedEmbed ? (embeds[selectedEmbed]?.html ?? '') : '';
  const directUrl = (() => {
    const raw = embeds?.original?.url ?? '';
    if (!raw) return '';
    try {
      const url = new URL(raw);
      url.searchParams.delete('download');
      return url.toString();
    } catch {
      return raw;
    }
  })();

  useEffect(() => {
    if (activeShareTab === 'embed' && !embedOptions.length && directUrl) {
      setActiveShareTab('direct');
    }
    if (activeShareTab === 'direct' && !directUrl && embedOptions.length) {
      setActiveShareTab('embed');
    }
  }, [activeShareTab, embedOptions.length, directUrl]);

  const copy = (text, setCopied) => {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="dam-asset-gallery-modal-overlay fixed inset-0 flex items-center justify-center bg-black bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dam-asset-gallery-modal bg-white rounded-lg shadow-2xl overflow-hidden p-4">
        <div className="dam-asset-gallery-modal-header flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h2 className="dam-asset-gallery-modal-header-title text-sm font-medium text-brand-dark leading-snug pb-2">Share asset</h2>
            <p className="text-xs font-normal text-brand-dark truncate mt-0.5">{filename}</p>
          </div>
          <button type="button" onClick={onClose} className="text-brand-dark hover:text-brand-dark transition">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="dam-asset-gallery-modal-body overflow-y-auto grid sm:grid-cols-2 gap-4">
          {/* Left: filename + thumbnail */}
          <div className="dam-asset-gallery-modal-thumbnail col-span-1 w-full items-center justify-center overflow-hidden rounded-lg border border-brand-tint-15 bg-gray-50 p-4">
            <img
              src={thumbnailUrl}
              alt={filename}
              className="w-full h-full object-contain"
            />
          </div>

          {/* Right: format dropdown + tabs + content */}
          <div className="dam-asset-gallery-modal-info-panel col-span-1 flex flex-col gap-2 flex-1 min-w-0">
            {embedOptions.length > 0 && (
              <CustomSelect
                label="Select Format"
                value={selectedEmbed}
                onChange={(value) => setSelectedEmbed(value)}
                options={embedOptions.map((key) => ({
                  value: key,
                  label: key,
                }))}
                disabled={false}
              />
            )}

            <div className="dam-asset-gallery-share-tabs flex items-center gap-2">
              {embedOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveShareTab('embed')}
                  className={`dam-asset-gallery-share-tab-embed px-4 py-2 text-sm font-medium border-b border-b-2 transition ${
                    activeShareTab === 'embed'
                      ? 'border-brand-blue-light text-brand-dark'
                      : 'border-brand-tint-15 text-brand-black hover:text-brand-dark'
                  }`}
                >
                  Embed code
                </button>
              )}

              {directUrl && (
                <button
                  type="button"
                  onClick={() => setActiveShareTab('direct')}
                  className={`dam-asset-gallery-share-tab-direct px-4 py-2 text-sm font-medium border-b border-b-2 transition ${
                    activeShareTab === 'direct'
                      ? 'border-brand-blue-light text-brand-dark'
                      : 'border-brand-tint-15 text-brand-black hover:text-brand-dark'
                  }`}
                >
                  Direct link
                </button>
              )}
            </div>

            {activeShareTab === 'embed' && embedOptions.length > 0 && (
              <div className="dam-asset-gallery-share-textarea-embed flex flex-col gap-2">
                <textarea
                  readOnly
                  value={embedCode}
                  rows={8}
                  className="w-full px-3 py-2 h-30 border border-brand-tint-15 rounded-md bg-gray-50 text-sm font-normal text-gray-700 resize-none focus:outline-none"
                />
                <div>
                  <button
                    type="button"
                    onClick={() => copy(embedCode, setCopiedEmbed)}
                    className="px-4 py-2 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-500 transition dam-asset-gallery-share-button cursor-pointer"
                  >
                    {copiedEmbed ? 'Copied!' : 'Copy code'}
                  </button>
                </div>
              </div>
            )}

            {activeShareTab === 'direct' && directUrl && (
              <div className="dam-asset-gallery-share-textarea-direct flex flex-col gap-2">
                <textarea
                  readOnly
                  value={directUrl}
                  rows={4}
                  className="w-full px-3 py-2 h-30 border border-brand-tint-15 rounded-md bg-gray-50 text-sm font-normal text-gray-700 resize-none focus:outline-none"
                />
                <div>
                  <button
                    type="button"
                    onClick={() => copy(directUrl, setCopiedDirect)}
                    className="px-4 py-2 text-xs font-medium rounded-md bg-blue-500 text-white hover:bg-blue-500 transition dam-asset-gallery-share-button cursor-pointer"
                  >
                    {copiedDirect ? 'Copied!' : 'Copy link'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="dam-asset-gallery-share-modal-footer px-5 py-2 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md bg-sky-500 text-white hover:bg-sky-500 transition dam-asset-gallery-share-button cursor-pointer"
          >
            I'm done
          </button>
        </div>
      </div>
    </div>
  );
}

function DownloadModal({ asset, assetLabel, onClose }) {
  const filename = getAssetLabel(asset, assetLabel);
  const thumbnailUrl = getThumbnailUrl(asset);

  const fileProps = asset?.file_properties;
  const sizeKb = fileProps?.size_in_kbytes ?? 0;
  const sizeLabel = sizeKb >= 1024
    ? `${Math.round(sizeKb / 1024)} MB`
    : `${sizeKb} kB`;
  const format = fileProps?.format ?? '';
  const imageProps = fileProps?.image_properties;
  const videoProps = fileProps?.video_properties;
  const dimensions = imageProps
    ? `${Math.round(imageProps.width)} x ${Math.round(imageProps.height)} px`
    : videoProps
    ? `${Math.round(videoProps.width)} x ${Math.round(videoProps.height)} px`
    : null;
  const downloadUrl = asset?._links?.download;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = () => {
    if (!downloadUrl) return;

    onClose();
    window.location.assign(downloadUrl);
  };

  return (
    <div
      className="dam-asset-gallery-modal-overlay fixed inset-0 flex items-center justify-center bg-black bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="dam-asset-gallery-modal bg-white rounded-xl shadow-2xl overflow-hidden p-4">
        {/* Header: filename + close */}
        <div className="dam-asset-gallery-modal-header flex items-start justify-between mb-4">
          <div className="min-w-0">
            <h2 className="dam-asset-gallery-modal-header-title text-base font-bold text-brand-black leading-snug pb-2">Download asset</h2>
            <p className="text-xs text-normal text-brand-black truncate mt-0.5">{filename}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 text-brand-dark hover:text-brand-dark transition mt-0.5"
            title="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body — stacked on mobile, side-by-side on sm+ */}
        <div className="dam-asset-gallery-modal-body overflow-y-auto grid sm:grid-cols-2 gap-4">
          {/* Thumbnail */}
          <div className="dam-asset-gallery-modal-thumbnail rounded-lg border border-brand-tint-15 bg-gray-50 overflow-hidden items-center justify-center w-full col-span-1 p-4">
            <img
              src={thumbnailUrl}
              alt={filename}
              className="w-full h-full object-contain"
            />
          </div>
          {/* Right column: file details + buttons */}
          <div className="dam-asset-gallery-modal-info-panel col-span-1 flex flex-col gap-2 flex-1 min-w-0">
            <h3 className="text-sm font-bold text-black break-words">
              File information
            </h3>
            {/* File details table */}
            <div className="dam-asset-gallery-modal-info rounded-lg overflow-hidden text-sm pt-2">
              {dimensions && (
                <div className="py-1 grid grid-cols-5">
                  <div className="col-span-2 text-xs font-bold text-black">Dimensions</div>
                  <div className="col-span-3 text-xs font-normal text-black">{dimensions}</div>
                </div>
              )}
              <div className="py-1 grid grid-cols-5">
                <div className="col-span-2 text-xs font-bold text-black">Size</div>
                <div className="col-span-3 text-xs font-normal text-black">{sizeLabel}</div>
              </div>
              {format && (
                <div className="py-1 grid grid-cols-5">
                  <div className="col-span-2 text-xs font-bold text-black">Format</div>
                  <div className="col-span-3 text-xs font-normal text-black">{format}</div>
                </div>
              )}
            </div>

            {/* Cancel + Download buttons */}
            <div className="dam-asset-gallery-modal-button-cancel flex items-center gap-2 mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text--brand-muted bg-slate-50 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              {downloadUrl ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="dam-asset-gallery-modal-button-download flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-500 text-white text-sm font-medium transition cursor-pointer"
                >
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </button>
              ) : (
                <p className="flex-1 text-sm text-gray-400 text-center">Not available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}