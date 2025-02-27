import { vi } from 'vitest';
import { render, screen, fireEvent } from '../../../tests/utils/test-utils';
import { FeedManagement } from '../FeedManagement';
import { Feed } from '../../../types/feed-management';
import { useFeedManagement } from '../../../hooks/useFeedManagement';

// Mock the useFeedManagement hook
vi.mock('../../../hooks/useFeedManagement', () => ({
  useFeedManagement: vi.fn()
}));

const mockFeeds: Feed[] = [
  {
    id: 1,
    feedUrl: 'https://example.com/feed.xml',
    title: 'Example Feed',
    description: 'An example RSS feed',
    siteUrl: 'https://example.com',
    iconUrl: 'https://example.com/icon.png',
    lastFetchedAt: new Date().toISOString(),
    errorCount: 0,
    isActive: true,
    fetchIntervalMinutes: 60,
    updateFrequency: 'hourly',
  },
];

describe('FeedManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    (useFeedManagement as any).mockReturnValue({
      feeds: [],
      addDialogOpen: false,
      editDialogOpen: false,
      selectedFeed: null,
      deleteDialogOpen: false,
      importResult: null,
      setAddDialogOpen: vi.fn(),
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: vi.fn(),
      isLoading: true
    });

    render(<FeedManagement loading={true} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders feed management interface when not loading', () => {
    (useFeedManagement as any).mockReturnValue({
      feeds: mockFeeds,
      addDialogOpen: false,
      editDialogOpen: false,
      selectedFeed: null,
      deleteDialogOpen: false,
      importResult: null,
      setAddDialogOpen: vi.fn(),
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: vi.fn(),
      isLoading: false
    });

    render(<FeedManagement />);
    expect(screen.getByText('Example Feed')).toBeInTheDocument();
  });

  it('opens add feed dialog when add button is clicked', () => {
    const mockSetAddDialogOpen = vi.fn();
    (useFeedManagement as any).mockReturnValue({
      feeds: mockFeeds,
      addDialogOpen: false,
      editDialogOpen: false,
      selectedFeed: null,
      deleteDialogOpen: false,
      importResult: null,
      setAddDialogOpen: mockSetAddDialogOpen,
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: vi.fn(),
      isLoading: false
    });

    render(<FeedManagement />);
    fireEvent.click(screen.getByText('Add Feed'));
    expect(mockSetAddDialogOpen).toHaveBeenCalledWith(true);
  });

  it('handles OPML file import', () => {
    const mockHandleImportOPML = vi.fn();
    (useFeedManagement as any).mockReturnValue({
      feeds: mockFeeds,
      addDialogOpen: false,
      editDialogOpen: false,
      selectedFeed: null,
      deleteDialogOpen: false,
      importResult: null,
      setAddDialogOpen: vi.fn(),
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: mockHandleImportOPML,
      isLoading: false
    });

    render(<FeedManagement />);
    
    const file = new File(['test content'], 'test.opml', { type: 'text/xml' });
    const input = screen.getByTestId('opml-input');
    
    // Use fireEvent to simulate file upload
    fireEvent.change(input, { target: { files: [file] } });
    
    // Check that the handler was called
    expect(mockHandleImportOPML).toHaveBeenCalledWith(file);
  });

  it('displays import results when available', () => {
    const importResult = {
      added: 2,
      skipped: 1,
      errors: [],
    };

    (useFeedManagement as any).mockReturnValue({
      feeds: mockFeeds,
      addDialogOpen: false,
      editDialogOpen: false,
      selectedFeed: null,
      deleteDialogOpen: false,
      importResult,
      setAddDialogOpen: vi.fn(),
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: vi.fn(),
      isLoading: false
    });

    render(<FeedManagement />);

    expect(screen.getByText('Import Results')).toBeInTheDocument();
    expect(screen.getByText('Successfully added 2 feeds.')).toBeInTheDocument();
    expect(screen.getByText('Skipped 1 duplicate feed.')).toBeInTheDocument();
  });

  it('displays edit dialog when a feed is selected for editing', () => {
    (useFeedManagement as any).mockReturnValue({
      feeds: mockFeeds,
      addDialogOpen: false,
      editDialogOpen: true,
      selectedFeed: mockFeeds[0],
      deleteDialogOpen: false,
      importResult: null,
      setAddDialogOpen: vi.fn(),
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: vi.fn(),
      isLoading: false
    });

    render(<FeedManagement />);

    expect(screen.getByText('Edit RSS Feed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Example Feed')).toBeInTheDocument();
  });

  it('displays delete confirmation dialog when deleting a feed', () => {
    (useFeedManagement as any).mockReturnValue({
      feeds: mockFeeds,
      addDialogOpen: false,
      editDialogOpen: false,
      selectedFeed: mockFeeds[0],
      deleteDialogOpen: true,
      importResult: null,
      setAddDialogOpen: vi.fn(),
      setEditDialogOpen: vi.fn(),
      setSelectedFeed: vi.fn(),
      setDeleteDialogOpen: vi.fn(),
      setImportResult: vi.fn(),
      handleAddFeed: vi.fn(),
      handleEditFeed: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteConfirm: vi.fn(),
      handleToggleActive: vi.fn(),
      handleRefreshFeed: vi.fn(),
      handleImportOPML: vi.fn(),
      isLoading: false
    });

    render(<FeedManagement />);

    expect(screen.getByText('Delete Feed')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
  });
}); 