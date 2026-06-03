import type { CertificateRow } from '../../types'
import { escapeAttr, escapeHtml, normalize } from '../../utils/text'

const fieldAliases = {
  recipientName: ['name', 'recipient_name', 'recipient name', 'student name', 'full name'],
  gender: ['sex', 'gender'],
  birthYear: ['birth_year', 'birth year', 'year of birth', 'dob_year'],
  birthMonth: ['birth_month', 'birth month', 'month of birth', 'dob_month'],
  birthDay: ['birth_day', 'birth day', 'day of birth', 'dob_day'],
  studyYear: ['study_year', 'study year', 'completion_year', 'completed year'],
  studyMonth: ['study_month', 'study month', 'completion_month', 'completed month'],
  issueDay: ['issue_day', 'issue day'],
  issueMonth: ['issue_month', 'issue month'],
  issueYear: ['issue_year', 'issue year'],
  recipientPhoto: ['picture', 'recipient_photo', 'recipient photo', 'photo', 'image'],
} as const

type FieldKey = keyof typeof fieldAliases

export const jianhuaTemplate = {
  name: 'Jianhua certificate',
  description: 'A4 landscape with fixed 3x4 cm student photo placement.',
  embeddedImageColumn: 'picture',
  columns: [
    'name',
    'sex',
    'birth_year',
    'birth_month',
    'birth_day',
    'study_year',
    'study_month',
    'issue_day',
    'issue_month',
    'issue_year',
    'picture',
  ],
  columnHelp: [
    'name',
    'sex',
    'birth_year / birth_month / birth_day',
    'study_year / study_month',
    'issue_day / issue_month / issue_year',
    'picture',
  ],
  value,
  renderCertificate,
}

function value(row: CertificateRow, key: FieldKey) {
  for (const alias of fieldAliases[key]) {
    const found = row[normalize(alias)]
    if (found) return found
  }
  return ''
}

function renderCertificate(row: CertificateRow, index: number, photo: string) {
  const issueDay = value(row, 'issueDay')
  const issueMonth = value(row, 'issueMonth')
  const issueYear = value(row, 'issueYear')

  return `
    <article class="certificate certificate--jianhua" aria-label="Certificate ${index + 1}">
      <div class="static-label label-student" data-font-field="labels">&#23398;&#29983;</div>
      <div class="static-label label-gender" data-font-field="labels">&#24615;&#21035;</div>
      <div class="static-label label-birth-year" data-font-field="labels">&#24180;</div>
      <div class="static-label label-birth-month" data-font-field="labels">&#26376;</div>
      <div class="static-label label-birth-day" data-font-field="labels">&#26085;&#29983;</div>
      <div class="static-label label-study-at" data-font-field="labels">&#20110;</div>
      <div class="static-label label-study-year" data-font-field="labels">&#24180;</div>
      <div class="static-label label-study-month" data-font-field="labels">&#26376;&#22312;&#26684;&#22484;&#23528;&#35199;&#28207;&#19996;&#21326;&#22806;&#35821;&#23398;&#26657;</div>
      <div class="static-label label-final" data-font-field="labels">&#29305;&#21457;&#27492;&#35777;</div>
      <div class="input-line line-name"></div>
      <div class="input-line line-gender"></div>
      <div class="input-line line-birth-year"></div>
      <div class="input-line line-birth-month"></div>
      <div class="input-line line-birth-day"></div>
      <div class="fill fill-name" data-font-field="name">${escapeHtml(value(row, 'recipientName'))}</div>
      <div class="fill fill-gender" data-font-field="gender">${escapeHtml(value(row, 'gender'))}</div>
      <div class="fill fill-birth-year" data-font-field="birthDate">${escapeHtml(value(row, 'birthYear'))}</div>
      <div class="fill fill-birth-month" data-font-field="birthDate">${escapeHtml(value(row, 'birthMonth'))}</div>
      <div class="fill fill-birth-day" data-font-field="birthDate">${escapeHtml(value(row, 'birthDay'))}</div>
      <div class="fill fill-study-year" data-font-field="studyDate">${escapeHtml(value(row, 'studyYear'))}</div>
      <div class="fill fill-study-month" data-font-field="studyDate">${escapeHtml(value(row, 'studyMonth'))}</div>
      <div class="fill fill-issue-day" data-font-field="issueDate">${escapeHtml(issueDay)}</div>
      <div class="fill fill-issue-month" data-font-field="issueDate">${escapeHtml(issueMonth)}</div>
      <div class="fill fill-issue-year" data-font-field="issueDate">${escapeHtml(issueYear)}</div>
      ${photo ? `<img class="fill-photo" src="${escapeAttr(photo)}" alt="">` : ''}
    </article>
  `
}
