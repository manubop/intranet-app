'use strict';

const FETCH_OPTIONS = {
    credentials: 'include',
    redirect: 'error'
};

const HOUR_FORMAT = {
    hour: '2-digit',
    minute: '2-digit'
};

const state = (function () {
    let sorted = null;
    /**
     * @param {JQuery<any>} th
     */
    const updateSort = function (th) {
        const title = th.attr('title');
        const ascending = th.attr('sort') === 'asc';
        const caret = ascending ? 'up' : 'down';

        th.html(`${title} <i class="fa fa-caret-${caret}"></i>`);

        if (sorted && !sorted.is(th)) {
            sorted.removeAttr('sort');
            sorted.text(sorted.attr('title'));
        }

        sorted = th;
    };
    return {
        /**
         * @param {JQuery<any>} th
         */
        toggleSort: function (th) {
            th.attr('sort', (_, attr) => attr === 'asc' ? 'dec' : 'asc');
            updateSort(th);
        },
        /**
         * @param {JQuery<any>} th
         * @param {boolean} ascending
         */
        setSort: function (th, ascending) {
            th.attr('sort', ascending ? 'asc' : 'dec');
            updateSort(th);
        }
    };
})();

function AuthorizationException () {};

function padInt (n) {
    return (n < 10 ? '0' : '') + n;
}

async function fetchRest (path) {
    const response = await fetch(path, FETCH_OPTIONS);
    const data = await response.json();
    if (data.authorization === 'failed') {
        throw new AuthorizationException();
    }
    return data;
}

function seance () {
    const id = $(this).attr('seance');
    fetchRest('/rest/seance/' + id)
        .then(data => {
            $('#infoContent').html(`<pre>${JSON.stringify(data, null, 2)}</pre>`);
            $('#info').show();
        })
        .catch(err => {
            console.error(err);
            window.location.replace('/login');
        });
}

async function getLines (nivol, debut, fin, filters) {
    let totalMinutes = 0;
    let totalItems = 0;
    let activites = 0;
    let structures = 0;
    const data = await fetchRest('/rest/utilisateur/' + nivol + '?debut=' + debut.toISOString() + '&fin=' + fin.toISOString());
    data.sort((first, second) => first.debut.localeCompare(second.debut));
    const promises = data.map(async item => {
        const debut = new Date(item.debut);
        const fin = new Date(item.fin);
        const duree = (fin - debut) / 1000 / 60;
        const minutes = duree % 60;
        const heures = (duree - minutes) / 60;
        const act = await fetchRest('/rest/activite/' + item.activite.id);
        $('#activites').text(`${++activites}/${data.length} activités`);
        const structure = await fetchRest('/rest/structure/' + act.structureOrganisatrice.id);
        $('#structures').text(`${++structures}/${data.length} structures`);
        const line = $('<tr>').on('click', seance).attr('seance', item.seance.id).append(
            $('<td class="date">').attr('date', debut.toISOString()).text(debut.toLocaleDateString('fr-FR')),
            $('<td class="w3-hide-small w3-hide-medium time">').text(debut.toLocaleTimeString('fr-FR', HOUR_FORMAT)),
            $('<td class="w3-hide-small w3-hide-medium time">').attr('duree', duree).text(padInt(heures) + ':' + padInt(minutes)),
            $('<td class="w3-hide-small">').text(act.typeActivite.action.libelle),
            $('<td>').text(act.libelle),
            $('<td class="w3-hide-small">').text(structure.libelle)
        );
        const children = line.children('td');
        const filtered = isLineFiltered(children, filters);
        line.css('display', filtered ? 'none' : '');
        if (!filtered) {
            totalItems++;
            totalMinutes += duree;
        }
        return line;
    });
    const lines = await Promise.all(promises);
    return {
        totalMinutes,
        totalItems,
        lines
    };
}

async function utilisateur () {
    const nivol = $('#nivol').val();
    const debut = new Date($('#debut').val());
    const fin = new Date($('#fin').val());
    fin.setDate(fin.getDate() + 1);
    const filters = getFilters($('#result thead tr:nth-child(2)')[0]);
    const table = $('#result tbody');
    try {
        $('#totalItems').hide();
        $('#activites').text('');
        $('#structures').text('');
        $('#status').show();
        table.children('tr').remove();
        const result = await getLines(nivol, debut, fin, filters);
        table.append(result.lines);
        state.setSort($('#result th').first(), true);
        $('#status').hide();
        $('#totalItems').show();
        $('#totalItems').text(`Total items: ${result.totalItems} / Total time: ${(result.totalMinutes / 60).toFixed(1)}h`);
    } catch (err) {
        console.error(err);
        if (err instanceof AuthorizationException) {
            window.location.replace('/login');
        }
    }
}

function loadBenevoles () {
    const ul = $('#ul').val();
    const input = $('#nivol');

    input.empty();

    fetchRest('/rest/benevoles/' + ul)
        .then(data => {
            data.sort((first, second) => {
                let r = first.nom.localeCompare(second.nom);
                if (!r) {
                    r = first.prenom.localeCompare(second.prenom);
                }
                return r;
            }).forEach(item => {
                input.append($('<option>', {
                    value: item.id,
                    text: item.nom + ' ' + item.prenom
                }));
            });
        })
        .catch(err => {
            console.error(err);
        });
}

function getFilters (tr) {
    return Array.prototype.map.call(tr.children, td => {
        const input = $(td).children('input')[0];
        return $(input).val().toUpperCase();
    });
}

function isLineFiltered (children, filters) {
    for (let i = 0; i < children.length; ++i) {
        const filter = filters[i];
        if (filter) {
            const text = $(children[i]).text();
            if (text.toUpperCase().indexOf(filter) < 0) {
                return true;
            }
        }
    }
    return false;
}

function filterTable () {
    const th = this.parentNode;
    const filters = getFilters(th.parentNode);
    let totalItems = 0;
    let totalMinutes = 0;
    $('#result tbody tr').each((index, tr) => {
        const children = $(tr).children('td');
        const filtered = isLineFiltered(children, filters);
        tr.style.display = filtered ? 'none' : '';
        if (!filtered) {
            totalItems++;
            totalMinutes += parseInt($(children[2]).attr('duree'));
        }
    });
    $('#totalItems').text(`Total items: ${totalItems} / Total time: ${(totalMinutes / 60).toFixed(1)}h`);
}

function getCellValue (x) {
    const date = $(x).attr('date');
    if (date) {
        return date;
    }
    return x.innerHTML;
}

function comparer (col, asc) {
    if (asc) {
        return (x, y) => {
            const xVal = getCellValue(x.children[col]);
            const yVal = getCellValue(y.children[col]);
            return xVal.localeCompare(yVal);
        };
    }
    return (x, y) => {
        const xVal = getCellValue(x.children[col]);
        const yVal = getCellValue(y.children[col]);
        return yVal.localeCompare(xVal);
    };
}

/**
 * @param {JQuery<any>} th
 */
function sortTable (th) {
    const ascending = th.attr('sort') === 'asc';
    const table = $('#result tbody');

    Array.from(table.children('tr'))
        .sort(comparer(th.index(), ascending))
        .forEach(tr => table.append(tr));
}

function loadAdmin () {
    fetch('/admin').then(response => {
        return response.text();
    }).then(data => {
        if (data === 'Unauthorized') {
            $('a.nav[did="admin"]').hide();
        } else {
            $('div#admin').html(data);
        }
    });
};

function navigate () {
    const t = $(this);
    if (t.attr('href')) {
        const did = t.attr('did');
        $('div.tab').addClass('w3-hide');
        $('div.tab#' + did).removeClass('w3-hide');
    }
};

function toggleSidebar (sidebar, main) {
    if (sidebar.hasClass('w3-hide')) {
        main.addClass('with-sidebar');
        sidebar.removeClass('w3-hide');
    } else {
        main.removeClass('with-sidebar');
        sidebar.addClass('w3-hide');
    }
};

function copyElementContents (el) {
    const range = document.createRange();
    const sel = window.getSelection();
    sel.removeAllRanges();
    try {
        range.selectNodeContents(el);
        sel.addRange(range);
    } catch (e) {
        range.selectNode(el);
        sel.addRange(range);
    }
    document.execCommand('Copy');
    sel.removeAllRanges();
};

/*
function copyTable () {
    const tableBody = $('#result tbody').get(0);
    copyElementContents(tableBody);
    navigator.clipboard.writeText("newClip").then(() => {
        console.log("success !");
    }).catch(() => {
        console.log("failure !");
    })
};
*/

function toggleSearchBarItem (x, i) {
    if (!x.hasClass('w3-show')) {
        x.addClass('w3-show');
        x.prev().addClass('w3-green');
        i.removeClass('fa-caret-down');
        i.addClass('fa-caret-up');
    } else {
        x.removeClass('w3-show');
        x.prev().removeClass('w3-green');
        i.removeClass('fa-caret-up');
        i.addClass('fa-caret-down');
    }
}

$(() => {
    loadBenevoles();
    loadAdmin();

    $('#ul').on('change', loadBenevoles);
    $('#fetch').on('click', utilisateur);
    $('#result thead input').on('keyup', filterTable);
    $('#result thead th').on('click', function () {
        const th = $(this);
        state.toggleSort(th);
        sortTable(th);
    });
    $('a.nav').on('click', navigate);
    $('.datepicker').datepicker({
        showOtherMonths: true,
        selectOtherMonths: true,
        dateFormat: 'yy-mm-dd'
    });

    const date = new Date();
    $('#debut').val(date.getFullYear() + '-' + padInt(date.getMonth() + 1) + '-01');
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    $('#fin').val(date.getFullYear() + '-' + padInt(date.getMonth() + 1) + '-' + date.getDate());

    const info = $('#info');
    $('#closeInfo').on('click', () => info.hide());

    const sidebar = $('#mySidebar');
    const main = $('#main');
    $('#toggleSidebar').on('click', toggleSidebar.bind(null, sidebar, main));
    $('#closeSidebar').on('click', toggleSidebar.bind(null, sidebar, main));

    const tableBody = $('#result tbody').get(0);
    $('#copyTable').on('click', copyElementContents.bind(null, tableBody));

    const x = $('#searchAccordion');
    const i = $('#searchBarItem i');
    $('#searchBarItem').on('click', toggleSearchBarItem.bind(null, x, i));

    $('#status').hide();
});
