package sourcegraph

import (
	"encoding/base64"
	"strings"

	"sourcegraph.com/sourcegraph/go-diff/diff"
	"sourcegraph.com/sourcegraph/sourcegraph/go-sourcegraph/spec"
)

// RouteVars returns the route variables for generating URLs to the
// delta specified by this DeltaSpec.
func (s DeltaSpec) RouteVars() map[string]string {
	m := s.Base.RouteVars()
	m["DeltaHeadRev"] = s.Head.ResolvedRevString()
	return m
}

// UnmarshalDeltaSpec marshals a map containing route variables
// generated by (*DeltaSpec).RouteVars() and returns the
// equivalent DeltaSpec struct.
func UnmarshalDeltaSpec(routeVars map[string]string) (DeltaSpec, error) {
	s := DeltaSpec{}

	rr, err := UnmarshalRepoRevSpec(routeVars)
	if err != nil {
		return DeltaSpec{}, err
	}
	s.Base = rr

	dhr := routeVars["DeltaHeadRev"]
	if i := strings.Index(dhr, ":"); i != -1 {
		// base repo != head repo
		repoPCB64, revPC := dhr[:i], dhr[i+1:]

		repoPC, err := base64.URLEncoding.DecodeString(repoPCB64)
		if err != nil {
			return DeltaSpec{}, err
		}

		rev, commitID := spec.ParseResolvedRev(revPC)
		s.Head = RepoRevSpec{RepoSpec: RepoSpec{URI: string(repoPC)}, Rev: rev, CommitID: commitID}
	} else {
		rev, commitID := spec.ParseResolvedRev(dhr)
		s.Head = RepoRevSpec{RepoSpec: rr.RepoSpec, Rev: rev, CommitID: commitID}
	}
	return s, nil
}

func (d *Delta) DeltaSpec() DeltaSpec {
	return DeltaSpec{
		Base: d.Base,
		Head: d.Head,
	}
}

// DiffStat returns a diffstat that is the sum of all of the files'
// diffstats.
func (d *DeltaFiles) DiffStat() diff.Stat {
	ds := diff.Stat{}
	for _, fd := range d.FileDiffs {
		st := fd.Stat()
		ds.Added += st.Added
		ds.Changed += st.Changed
		ds.Deleted += st.Deleted
	}
	return ds
}
