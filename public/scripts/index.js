'use strict';

const FETCH_OPTIONS = {
    credentials: 'include',
    redirect: 'error'
};

const HOUR_FORMAT = {
    hour: '2-digit',
    minute: '2-digit'
};

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

async function utilisateur () {
    const nivol = $('#nivol').val();
    const debut = new Date($('#debut').val());
    const fin = new Date($('#fin').val());
    fin.setDate(fin.getDate() + 1);
    const filters = getFilters($('#result thead tr:nth-child(2)')[0]);
    try {
        const data = await fetchRest('/rest/utilisateur/' + nivol + '?debut=' + debut.toISOString() + '&fin=' + fin.toISOString());
        const table = $('#result tbody');
        table.children('tr').remove();
        data.sort((first, second) => first.debut.localeCompare(second.debut));
        data.forEach(item => {
            const debut = new Date(item.debut);
            const fin = new Date(item.fin);
            const total = (fin - debut) / 1000 / 60;
            const minutes = total % 60;
            const heures = (total - minutes) / 60;
            const line = $('<tr>');
            table.append(line.click(seance).attr('seance', item.seance.id).append(
                $('<td class="date">').attr('date', debut.toISOString()).text(debut.toLocaleDateString('fr-FR')),
                $('<td class="w3-hide-small w3-hide-medium time">').text(debut.toLocaleTimeString('fr-FR', HOUR_FORMAT)),
                $('<td class="w3-hide-small w3-hide-medium time">').text(padInt(heures) + ':' + padInt(minutes)),
                $('<td class="w3-hide-small">'),
                $('<td>'),
                $('<td class="w3-hide-small">')
            ));
            line.css('display', isLineFiltered(line, filters) ? 'none' : '');
            fetchRest('/rest/activite/' + item.activite.id)
                .then(act => {
                    line.children('td:nth-child(4)').text(act.typeActivite.action.libelle);
                    line.children('td:nth-child(5)').text(act.libelle);
                    line.css('display', isLineFiltered(line, filters) ? 'none' : '');
                    fetchRest('/rest/structure/' + act.structureOrganisatrice.id)
                        .then(data => {
                            line.children('td:nth-child(6)').text(data.libelle);
                            line.css('display', isLineFiltered(line, filters) ? 'none' : '');
                        });
                })
                .catch(err => {
                    console.error(err);
                });
        });
    } catch (err) {
        console.error(err);
        window.location.replace('/login');
    }
}

function loadBenevoles () {
    fetchRest('/rest/benevoles/974')
        .then(data => {
            const input = $('#nivol');
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

function isLineFiltered(tr, filters) {    
    for (let i = 0, children = $(tr).children('td'); i < children.length; ++i) {
        let filter = filters[i];
        if (filter) {
            let text = $(children[i]).text();
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
    $('#result tbody tr').each((index, tr) => {
        tr.style.display = isLineFiltered(tr, filters) ? 'none' : '';
    });
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

function sortTable () {
    const th = this;
    const col = Array.from(th.parentNode.children).indexOf(th);
    const table = $('#result tbody');
    Array.from(table.children('tr'))
        .sort(comparer(col, this.asc = !this.asc))
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

$(document).ready(() => {
    loadBenevoles();
    loadAdmin();

    $('#fetch').click(utilisateur);
    $('#result thead input').keyup(filterTable);
    $('#result thead th').click(sortTable);
    $('a.nav').click(navigate);
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
    $('#closeInfo').click(() => info.hide());

    const sidebar = $('#mySidebar');
    const main = $('#main');
    $('#toggleSidebar').click(toggleSidebar.bind(null, sidebar, main));
    $('#closeSidebar').click(toggleSidebar.bind(null, sidebar, main));

    const tableBody = $('#result tbody').get(0);
    $('#copyTable').click(copyElementContents.bind(null, tableBody));

    const x = $('#searchAccordion');
    const i = $('#searchBarItem i');
    $('#searchBarItem').click(toggleSearchBarItem.bind(null, x, i));
});
