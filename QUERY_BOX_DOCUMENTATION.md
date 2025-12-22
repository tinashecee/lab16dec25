# Lab Operations Query Box - Feature Documentation

## Overview
The Query Box is a comprehensive knowledge management system integrated into the dashboard. It allows lab staff to post operational challenges, share solutions, and build a searchable knowledge base for future reference.

## Features

### 1. Submit Queries
- Users can submit queries about lab operations
- Each query includes:
  - Title
  - Description
  - Category (Equipment, Sample Processing, Reporting, Safety, Quality Control, General)
  - Priority (Low, Normal, High, Urgent)
  - File attachments (optional, multiple files supported)
  - Automatic tracking of submission date and submitter

### 2. Query Management with Tabs
- **Tab-Based Navigation**: Quick access to queries by status:
  - **Open Tab**: New queries awaiting attention
  - **In Progress Tab**: Currently being addressed
  - **Resolved Tab**: Solution provided (shows solutions inline)
  - **Closed Tab**: Issue resolved and archived (shows solutions inline)
- Each tab displays the count of queries in that status
- Active tab is highlighted for easy identification

### 3. Solution System
- Any authenticated user can provide solutions
- Solutions are permanently attached to queries
- Solutions include:
  - Solution text/description
  - Provider name
  - Timestamp
- Automatically marks query as "Resolved" when solution is added
- **Solutions are displayed inline** on Resolved and Closed tabs for easy reference

### 4. Advanced Search and Filtering
- **Search**: Full-text search across query titles and descriptions
- **Category Filter**: Filter by specific operational categories
- **Items Per Page**: Choose how many queries to display (5, 10, 20, or 50 per page)
- Filters work in combination with active tab

### 5. Pagination System
- View 10 queries per page by default
- Navigate through pages using:
  - Previous/Next buttons
  - Direct page number buttons
  - Ellipsis (...) for condensed page navigation
- Shows current range (e.g., "Showing 1 to 10 of 45 queries")
- Optional view filter to change items per page (5, 10, 20, 50)
- Automatically resets to page 1 when changing filters or tabs

### 6. Dashboard Statistics
- Real-time count of:
  - Open queries
  - In Progress queries
  - Resolved queries
  - Closed queries
- Statistics update automatically when queries are added or modified

### 7. Visual Indicators
- Color-coded status badges
- Priority indicators (color-coded)
- Solution status icons
- Inline solution display on Resolved/Closed tabs with:
  - Green-highlighted solution boxes
  - Solution text preview (expandable in detail view)
  - Provider name and date

### 8. File Attachments System
- **Upload Files**: Attach relevant documents, images, or files to queries
- **Multiple Files**: Upload multiple files when submitting a query
- **File Management**: 
  - View all attachments with file name, size, and uploader info
  - Download attachments directly from the query
  - Add attachments after query creation (on non-closed queries)
  - Maximum file size: 10MB per file
- **File Information**:
  - File name and type
  - File size (formatted)
  - Uploader name and timestamp

### 9. Comments System
- **Real-time Comments**: Add comments to discuss queries
- **Comment Thread**: View all comments in chronological order
- **Comment Details**: Each comment shows:
  - Commenter's name
  - Date and time posted
  - Full comment text
- **Quick Comment**: Press Enter to submit comments quickly
- **Comment Count**: See number of comments at a glance
- **Disabled on Closed**: Comments disabled when query is closed

## User Interface

### Main Query Box
Located on the dashboard, the Query Box displays:
- **Header Section**:
  - Title and description
  - "New Query" button
  - Four statistics cards (Open, In Progress, Resolved, Closed)
- **Tab Navigation**:
  - Four tabs with query counts
  - Active tab highlighted in primary color
- **Filter Bar**:
  - Search input field
  - Category dropdown filter
  - Items per page selector (5, 10, 20, 50)
- **Query List**:
  - Paginated list of queries
  - Solutions displayed inline on Resolved/Closed tabs
- **Pagination Controls**:
  - Page range indicator
  - Previous/Next buttons
  - Page number buttons
  - Smart ellipsis for many pages

### Query Details Modal
Click any query to view:
- Full description
- Status and priority
- Submitted by information
- **File attachments** (view and download)
- **Upload new attachments** (if not closed)
- **Comments section** with:
  - All existing comments
  - Comment count
  - Add new comment input
  - Send button
- Existing solution (if any)
- Option to add solution
- Status update controls

### New Query Modal
Submit new queries with:
- Title (required)
- Description (required)
- Category selection
- Priority selection
- **File attachments** (optional):
  - Upload multiple files
  - Preview uploaded files
  - Remove files before submission
  - File size limit: 10MB per file

## Technical Implementation

### Files Created

1. **Type Definition** (`src/types/query.ts`)
   - Query interface
   - QuerySolution interface
   - NewQuery interface

2. **Service Layer** (`src/services/queryService.ts`)
   - `getQueries()`: Fetch all queries
   - `getQueriesByStatus()`: Filter by status
   - `getQueriesByCategory()`: Filter by category
   - `createQuery()`: Create new query
   - `updateQuery()`: Update query details
   - `addSolution()`: Add solution to query
   - `getQueryById()`: Get specific query
   - `getUserQueries()`: Get queries by user
   - `getAssignedQueries()`: Get assigned queries

3. **UI Component** (`src/components/dashboard/QueryBox.tsx`)
   - Main QueryBox component
   - QueryItem component (list view)
   - QueryDetailsModal component
   - NewQueryModal component

4. **Dashboard Integration** (`src/pages/Dashboard.tsx`)
   - QueryBox component added to dashboard

5. **Security Rules** (`firestore.rules`)
   - Validation for query creation
   - Read/write permissions
   - Status and category validation

### Firebase Collection Structure

Collection: `queries`

Document structure:
```json
{
  "id": "auto-generated",
  "title": "string",
  "description": "string",
  "category": "Equipment | Sample Processing | Reporting | Safety | Quality Control | General",
  "priority": "Low | Normal | High | Urgent",
  "status": "Open | In Progress | Resolved | Closed",
  "submittedBy": "user_id",
  "submittedByName": "User Name",
  "assignedTo": "user_id (optional)",
  "assignedToName": "Assignee Name (optional)",
  "solution": {
    "id": "solution_id",
    "text": "solution description",
    "providedBy": "user_id",
    "providedByName": "Provider Name",
    "createdAt": "timestamp"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "resolvedAt": "timestamp (optional)"
}
```

## Usage Guide

### For Lab Staff (Submitting Queries)

1. **Submit a Query**
   - Navigate to Dashboard
   - Click "New Query" button
   - Fill in:
     - Clear, descriptive title
     - Detailed description of the challenge
     - Appropriate category
     - Priority level
     - **Attach relevant files** (optional):
       - Click "Attach Files" button
       - Select one or multiple files
       - Review uploaded files (shown with name and size)
       - Remove any file if needed
   - Click "Submit Query"

2. **Search for Existing Solutions**
   - Click on the **Resolved** or **Closed** tabs
   - Solutions are displayed directly in the query cards
   - Use the search bar to find similar queries
   - Filter by category for specific topics
   - Adjust items per page for easier browsing
   - Click on queries to view full solution details
   - Download any attached files for reference

3. **Engage with Queries**
   - **Add Comments**: Share updates, ask questions, or provide context
   - **Upload Files**: Add supporting documents at any time (before query is closed)
   - **Download Attachments**: Access files shared by others

### For Problem Solvers (Providing Solutions)

1. **View Open Queries**
   - Click on the **Open** tab
   - Browse through available queries
   - Use pagination to navigate through multiple pages
   - Click on a query to view details
   - **Review attachments** to understand the issue better
   - **Read comments** to see ongoing discussions

2. **Provide Solution**
   - In the query details modal
   - **Review all information**:
     - Description
     - Attached files
     - Comments from others
   - **Discuss via comments** if clarification is needed
   - **Upload supporting files** if helpful (screenshots, documents, etc.)
   - Scroll to "Add Solution" section
   - Enter detailed solution
   - Click "Submit Solution"
   - Query automatically marked as "Resolved"
   - Solution will now appear inline on the Resolved tab

### For Supervisors (Managing Queries)

1. **Monitor Query Status**
   - View dashboard statistics showing all four statuses
   - Use tabs to quickly access queries by status
   - Check open vs. resolved ratios

2. **Update Query Status**
   - Click **Open** tab to see new queries
   - Mark queries as "In Progress" when being addressed
   - View resolved queries with their solutions
   - Close resolved queries when fully addressed
   - Track resolution times

3. **Review Solutions**
   - Navigate to **Resolved** or **Closed** tabs
   - Solutions are displayed inline for quick review
   - Adjust items per page to review more or fewer at once
   - Use pagination to review historical solutions

## Benefits

1. **Knowledge Preservation**: Solutions are permanently stored and easily searchable
2. **Reduced Downtime**: Staff can quickly find solutions to common problems
3. **Continuous Improvement**: Identify recurring issues
4. **Team Collaboration**: Encourage knowledge sharing
5. **Training Resource**: New staff can learn from historical queries
6. **Accountability**: Track who submitted and resolved queries

## Best Practices

### For Submitting Queries
- Use clear, descriptive titles
- Provide detailed context in descriptions
- Select appropriate category and priority
- Include relevant details (equipment model, sample types, etc.)
- **Attach supporting files**:
  - Screenshots of error messages
  - Photos of equipment issues
  - Relevant documents or protocols
  - Log files if applicable

### For Providing Solutions
- Be specific and detailed
- Include step-by-step instructions when applicable
- Mention any tools or resources needed
- Note any precautions or safety considerations
- **Use comments for discussion**:
  - Ask clarifying questions
  - Share intermediate findings
  - Collaborate with team members
- **Attach helpful files**:
  - Solution screenshots
  - Updated protocols
  - Reference documents

### For Maintenance
- Regularly review and close resolved queries
- Update solutions if better approaches are found
- Archive outdated queries
- Monitor for recurring issues

## Recent Enhancements (Implemented)

✅ **Tab Navigation** - Quick access to queries by status  
✅ **Pagination System** - 10 items per page with navigation controls  
✅ **Configurable Page Size** - Choose 5, 10, 20, or 50 items per page  
✅ **Inline Solution Display** - Solutions shown directly on Resolved/Closed tabs  
✅ **Enhanced Statistics** - Four separate counters for all statuses  
✅ **Smart Tab Counts** - Each tab shows relevant query count  
✅ **File Attachments** - Upload and download files with queries  
✅ **Comments System** - Real-time comment threads on queries

## Future Enhancements (Potential)

1. Assign queries to specific users
2. Email/SMS notifications for new queries and comments
3. Analytics and reporting dashboard
4. Query templates for common issues
5. Tags for better categorization
6. Query voting/rating system
7. Expert designation for solution providers
8. Integration with equipment maintenance logs
9. Export queries and solutions to PDF/Excel
10. Advanced search with multiple criteria
11. Query aging/SLA tracking
12. Attachment preview (images, PDFs)
13. @mentions in comments
14. Comment editing and deletion
15. Attachment versioning
16. Rich text editor for descriptions

## Support

For technical issues or feature requests related to the Query Box, contact your system administrator or development team.

---

**Version**: 1.0  
**Last Updated**: November 2025  
**Component**: Lab Operations Query Box

