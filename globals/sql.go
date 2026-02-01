package globals

import (
	"database/sql"
	"regexp"
	"strings"
)

var SqliteEngine = false

type batch struct {
	Old   string
	New   string
	Regex *regexp.Regexp
}

func batchReplace(sql string, batch []batch) string {
	for _, item := range batch {
		if item.Regex != nil {
			sql = item.Regex.ReplaceAllString(sql, item.New)
			continue
		}

		sql = strings.ReplaceAll(sql, item.Old, item.New)
	}
	return sql
}

var (
	textRegex = regexp.MustCompile(`TEXT\(\d+\)`)
	realRegex = regexp.MustCompile(`REAL\(\d+,\d+\)`)
)

func PreflightSql(sql string) string {
	// this is a simple way to adapt the sql to the sqlite engine
	// it's not a common way to use sqlite in production, just as polyfill

	if SqliteEngine {
		if strings.Contains(sql, "DUPLICATE KEY") {
			sql = batchReplace(sql, []batch{
				{
					Old: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quota = ?",
					New: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET quota = ?",
				},
				{
					Old: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE used = ?",
					New: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET used = ?",
				},
				{
					Old: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quota = quota + ?",
					New: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET quota = quota + ?",
				},
				{
					Old: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE used = used + ?",
					New: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET used = used + ?",
				},
				{
					Old: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quota = quota - ?",
					New: "INSERT INTO quota (user_id, quota, used) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET quota = quota - ?",
				},
			})
		}

		sql = batchReplace(sql, []batch{
			// KEYWORD REPLACEMENT
			{Old: `INT `, New: `INTEGER `},
			{Old: ` AUTO_INCREMENT`, New: ` AUTOINCREMENT`},
			{Old: `DATETIME`, New: `TEXT`},
			{Old: `DECIMAL`, New: `REAL`},
			{Old: `MEDIUMTEXT`, New: `TEXT`},
			{Old: `VARCHAR`, New: `TEXT`},

			// TEXT(65535) -> TEXT, REAL(10,2) -> REAL
			{New: `TEXT`, Regex: textRegex},
			{New: `REAL`, Regex: realRegex},

			// UNIQUE KEY -> UNIQUE
			{Old: `UNIQUE KEY`, New: `UNIQUE`},
		})
	}

	return sql
}

func ExecDb(db *sql.DB, sql string, args ...interface{}) (sql.Result, error) {
	sql = PreflightSql(sql)
	return db.Exec(sql, args...)
}

func PrepareDb(db *sql.DB, sql string) (*sql.Stmt, error) {
	sql = PreflightSql(sql)
	return db.Prepare(sql)
}

func QueryDb(db *sql.DB, sql string, args ...interface{}) (*sql.Rows, error) {
	sql = PreflightSql(sql)
	return db.Query(sql, args...)
}

func QueryRowDb(db *sql.DB, sql string, args ...interface{}) *sql.Row {
	sql = PreflightSql(sql)
	return db.QueryRow(sql, args...)
}
