document.addEventListener('DOMContentLoaded', function() {
    let expandedCell = null;

    // Handle clicks anywhere in the document
    document.addEventListener('click', function(e) {
        // If click is on a cell that's not expanded, collapse any expanded cell
        const clickedCell = e.target.closest('.truncate-cell');
        if (expandedCell && (!clickedCell || clickedCell !== expandedCell)) {
            expandedCell.classList.remove('expanded');
            expandedCell = null;
        }
    });

    // Handle double clicks on cells
    const cells = document.querySelectorAll('.truncate-cell');
    cells.forEach(cell => {
        cell.addEventListener('dblclick', function(e) {
            e.stopPropagation();
            
            // Toggle current cell
            this.classList.toggle('expanded');
            expandedCell = this.classList.contains('expanded') ? this : null;
        });
    });
});