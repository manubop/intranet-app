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
            $('#info').text(JSON.stringify(data));
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
    try {
        const data = await fetchRest('/rest/utilisateur/' + nivol + '?debut=' + debut.toISOString() + '&fin=' + fin.toISOString());
        // Work with JSON data here
        console.log(data);
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
            fetchRest('/rest/activite/' + item.activite.id)
                .then(act => {
                    line.children('td:nth-child(4)').text(act.typeActivite.action.libelle);
                    line.children('td:nth-child(5)').text(act.libelle);
                    fetchRest('/rest/structure/' + act.structureOrganisatrice.id)
                        .then(data => {
                            line.children('td:nth-child(6)').text(data.libelle);
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

function filterTable () {
    const input = this;
    const th = input.parentNode;
    const col = Array.from(th.parentNode.children).indexOf(th);
    const filter = $(input).val().toUpperCase();
    $('#result tbody tr').each((index, tr) => {
        const td = $(tr).children('td')[col];
        if (td) {
            tr.style.display = $(td).text().toUpperCase().indexOf(filter) > -1 ? '' : 'none';
        }
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
    if ($(this).attr('href')) {
        const did = $(this).attr('did');
        $('div.tab').hide();
        $('div.tab#' + did).show();
    }
};

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
});
